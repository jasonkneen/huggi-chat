import { query } from "@anthropic-ai/claude-agent-sdk";
import {
	MessageUpdateType,
	MessageToolUpdateType,
	MessageReasoningUpdateType,
	type MessageUpdate,
} from "$lib/types/MessageUpdate";
import { ToolResultStatus } from "$lib/types/Tool";
import type { TextGenerationContext } from "./types";
import type { EndpointMessage } from "../endpoints/endpoints";
import { logger } from "../logger";
import { thinkingTokensMap } from "$lib/stores/thinkingLevel";
import { randomUUID } from "crypto";
import { getMcpServers } from "../mcp/registry";
import { getOpenAiToolsForMcp } from "../mcp/tools";
import { buildToolPreprompt } from "./utils/toolPrompt";

type GenerateContext = Omit<TextGenerationContext, "messages"> & { messages: EndpointMessage[] };

export async function* generateClaudeAgentSdk(
	ctx: GenerateContext,
	preprompt?: string
): AsyncGenerator<MessageUpdate, void, undefined> {
	const { model, messages, locals, abortController } = ctx;

	const rawModelId = model.id || model.name || "claude-sonnet-4-5";
	const modelId = rawModelId.replace(/-\d{8}$/, "");

	const lastUserMessage = messages.filter((m) => m.from === "user").pop();
	const prompt = lastUserMessage?.content || "";

	const thinkingLevel = (locals as unknown as Record<string, unknown>)?.thinkingLevel as
		| number
		| undefined;
	const budgetTokens = thinkingLevel !== undefined ? thinkingTokensMap[thinkingLevel] : undefined;

	// Load MCP tools for this request
	let systemPrompt = preprompt || "";
	try {
		const baseServers = getMcpServers();
		const reqMcp = (
			locals as unknown as {
				mcp?: {
					selectedServers?: Array<{ name: string; url: string; headers?: Record<string, string> }>;
					selectedServerNames?: string[];
				};
			}
		)?.mcp;

		const selectedServers = Array.isArray(reqMcp?.selectedServers) ? reqMcp.selectedServers : [];
		const servers = [...baseServers, ...selectedServers];

		if (servers.length > 0) {
			const { tools, mapping } = await getOpenAiToolsForMcp(servers, {
				signal: abortController.signal,
			});

			if (tools.length > 0) {
				const toolPreprompt = buildToolPreprompt(tools, mapping);
				systemPrompt = [toolPreprompt, preprompt].filter(Boolean).join("\n\n");
				logger.info(
					{ toolCount: tools.length, serverCount: servers.length },
					"[claude-agent-sdk] Loaded MCP tools"
				);
			}
		}
	} catch (error) {
		logger.error({ error }, "[claude-agent-sdk] Failed to load MCP tools, continuing without them");
	}

	logger.info({ modelId, thinkingLevel, budgetTokens }, "[claude-agent-sdk] Starting generation");

	try {
		const response = query({
			prompt,
			options: {
				model: modelId,
				systemPrompt,
				includePartialMessages: true,
				...(budgetTokens !== undefined && { budgetTokens }),
			},
		});

		let generatedText = "";
		let inThinking = false;
		let currentToolUseId = "";
		let currentToolName = "";
		let toolInputJson = "";
		const toolUuidMap = new Map<string, string>();

		for await (const message of response) {
			if (abortController.signal.aborted) break;

			if (message.type === "stream_event") {
				const event = message.event;

				if (event.type === "content_block_start") {
					const block = event.content_block;

					if (block?.type === "thinking") {
						inThinking = true;
						yield {
							type: MessageUpdateType.Reasoning,
							subtype: MessageReasoningUpdateType.Status,
							status: "Thinking...",
						};
					} else if (block?.type === "tool_use") {
						currentToolUseId = block.id || "";
						currentToolName = block.name || "unknown_tool";
						toolInputJson = "";

						const uuid = randomUUID();
						toolUuidMap.set(currentToolUseId, uuid);

						yield {
							type: MessageUpdateType.Tool,
							subtype: MessageToolUpdateType.Call,
							uuid,
							call: {
								name: currentToolName,
								parameters: {},
								toolId: currentToolUseId,
							},
						};
					}
				} else if (event.type === "content_block_delta") {
					const delta = event.delta;

					if (delta?.type === "thinking_delta" && delta.thinking) {
						yield {
							type: MessageUpdateType.Reasoning,
							subtype: MessageReasoningUpdateType.Stream,
							token: delta.thinking,
						};
					} else if (delta?.type === "text_delta" && delta.text) {
						if (!inThinking) {
							generatedText += delta.text;
							yield { type: MessageUpdateType.Stream, token: delta.text };
						}
					} else if (delta?.type === "input_json_delta" && delta.partial_json) {
						toolInputJson += delta.partial_json;
					}
				} else if (event.type === "content_block_stop") {
					if (inThinking) {
						inThinking = false;
						yield {
							type: MessageUpdateType.Reasoning,
							subtype: MessageReasoningUpdateType.Status,
							status: "Done thinking",
						};
					} else if (currentToolUseId) {
						const uuid = toolUuidMap.get(currentToolUseId) || randomUUID();
						let parsedArgs: Record<string, string | number | boolean> = {};
						try {
							parsedArgs = JSON.parse(toolInputJson || "{}");
						} catch (parseErr) {
							logger.error({
								error: parseErr instanceof Error ? parseErr.message : String(parseErr),
								toolInputJson: toolInputJson.slice(0, 200), // First 200 chars for debugging
								toolName: currentToolName,
								toolUseId: currentToolUseId,
							}, "[claude-agent-sdk] Failed to parse tool input JSON");

							parsedArgs = {};

							// Yield error to UI
							yield {
								type: MessageUpdateType.Tool,
								subtype: MessageToolUpdateType.Error,
								uuid,
								message: "Failed to parse tool arguments",
							};
						}

						yield {
							type: MessageUpdateType.Tool,
							subtype: MessageToolUpdateType.Call,
							uuid,
							call: {
								name: currentToolName,
								parameters: parsedArgs,
								toolId: currentToolUseId,
							},
						};
					}
				}
			} else if (message.type === "user") {
				const userMessage = message as {
					type: "user";
					message: {
						content?: Array<{ type: string; tool_use_id?: string; content?: string }>;
					};
				};

				const content = userMessage.message?.content;
				if (Array.isArray(content)) {
					for (const block of content) {
						if (block.type === "tool_result" && block.tool_use_id) {
							const uuid = toolUuidMap.get(block.tool_use_id) || randomUUID();
							const resultContent = block.content || "";

							yield {
								type: MessageUpdateType.Tool,
								subtype: MessageToolUpdateType.Result,
								uuid,
								result: {
									status: ToolResultStatus.Success,
									call: {
										name: currentToolName,
										parameters: {},
										toolId: block.tool_use_id,
									},
									outputs: [
										{
											output:
												typeof resultContent === "string"
													? resultContent
													: JSON.stringify(resultContent),
										},
									],
								},
							};
						}
					}
				}

				currentToolUseId = "";
				currentToolName = "";
				toolInputJson = "";
			} else if (message.type === "assistant") {
				const assistantMessage = message as {
					type: "assistant";
					message: { content?: Array<{ type: string; text?: string }> };
				};

				const content = assistantMessage.message?.content;
				if (Array.isArray(content)) {
					for (const block of content) {
						if (block.type === "text" && block.text) {
							if (!generatedText.includes(block.text)) {
								generatedText += block.text;
								yield { type: MessageUpdateType.Stream, token: block.text };
							}
						}
					}
				}
			} else if (message.type === "result") {
				yield {
					type: MessageUpdateType.FinalAnswer,
					text: generatedText,
					interrupted: false,
				};
				return;
			}
		}

		if (generatedText) {
			yield {
				type: MessageUpdateType.FinalAnswer,
				text: generatedText,
				interrupted: abortController.signal.aborted,
			};
		}
	} catch (error) {
		logger.error({ error, modelId }, "[claude-agent-sdk] Generation error");
		throw error;
	}
}
