import { z } from "zod";
import type {
	Endpoint,
	EndpointParameters,
	TextGenerationStreamOutputSimplified,
} from "../endpoints";
import { logger } from "$lib/server/logger";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { thinkingTokensMap } from "$lib/stores/thinkingLevel";

export const endpointClaudeAgentSdkParametersSchema = z.object({
	type: z.literal("claude-agent-sdk"),
	model: z.any().optional(),
});

type EndpointClaudeAgentSdkParams = z.infer<typeof endpointClaudeAgentSdkParametersSchema> & {
	model?: { id?: string; name?: string };
};

export async function endpointClaudeAgentSdk(
	params: EndpointClaudeAgentSdkParams
): Promise<Endpoint> {
	const rawModelId = params.model?.id || params.model?.name || "claude-sonnet-4-5";
	const modelId = rawModelId.replace(/-\d{8}$/, "");

	return async (
		endpointParams: EndpointParameters
	): Promise<AsyncGenerator<TextGenerationStreamOutputSimplified, void, void>> => {
		const { messages, preprompt, locals } = endpointParams;

		const lastUserMessage = messages.filter((m) => m.from === "user").pop();
		const prompt = lastUserMessage?.content || "";
		const systemPrompt = preprompt || undefined;

		const thinkingLevel = (locals as unknown as Record<string, unknown>)?.thinkingLevel as
			| number
			| undefined;
		const budgetTokens = thinkingLevel !== undefined ? thinkingTokensMap[thinkingLevel] : undefined;

		async function* generate(): AsyncGenerator<TextGenerationStreamOutputSimplified, void, void> {
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
				let tokenCount = 0;
				let inThinking = false;
				let currentToolUseId = "";
				let currentToolName = "";
				let toolInputJson = "";
				const toolResults = new Map<string, string>();

				for await (const message of response) {
					if (message.type === "stream_event") {
						const event = message.event;

						if (event.type === "content_block_start") {
							const block = event.content_block;

							if (block?.type === "thinking") {
								inThinking = true;
								const text = "<think>";
								generatedText += text;
								yield {
									token: { id: tokenCount++, text, logprob: 0, special: false },
									generated_text: null,
									details: null,
								};
							} else if (block?.type === "tool_use") {
								currentToolUseId = block.id || "";
								currentToolName = block.name || "unknown_tool";
								toolInputJson = "";

								const text = `\n\n**Tool: ${currentToolName}**\n\`\`\`json\n`;
								generatedText += text;
								yield {
									token: { id: tokenCount++, text, logprob: 0, special: false },
									generated_text: null,
									details: null,
								};
							}
						} else if (event.type === "content_block_delta") {
							const delta = event.delta;

							if (delta?.type === "thinking_delta" && delta.thinking) {
								const text = delta.thinking;
								generatedText += text;
								yield {
									token: { id: tokenCount++, text, logprob: 0, special: false },
									generated_text: null,
									details: null,
								};
							} else if (delta?.type === "text_delta" && delta.text) {
								const text = delta.text;
								generatedText += text;
								yield {
									token: { id: tokenCount++, text, logprob: 0, special: false },
									generated_text: null,
									details: null,
								};
							} else if (delta?.type === "input_json_delta" && delta.partial_json) {
								toolInputJson += delta.partial_json;
								const text = delta.partial_json;
								generatedText += text;
								yield {
									token: { id: tokenCount++, text, logprob: 0, special: false },
									generated_text: null,
									details: null,
								};
							}
						} else if (event.type === "content_block_stop") {
							if (inThinking) {
								inThinking = false;
								const text = "</think>\n\n";
								generatedText += text;
								yield {
									token: { id: tokenCount++, text, logprob: 0, special: false },
									generated_text: null,
									details: null,
								};
							} else if (currentToolUseId) {
								const text = "\n\`\`\`\n";
								generatedText += text;
								yield {
									token: { id: tokenCount++, text, logprob: 0, special: false },
									generated_text: null,
									details: null,
								};
							}
						}
					} else if (message.type === "user") {
						// SDK returns tool results as user messages with tool_result content blocks
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
									const resultContent = block.content || "";
									toolResults.set(block.tool_use_id, resultContent);

									const resultText =
										typeof resultContent === "string"
											? resultContent
											: JSON.stringify(resultContent, null, 2);

									const text = `\n**Result:**\n\`\`\`\n${resultText.slice(0, 2000)}${resultText.length > 2000 ? "\n... (truncated)" : ""}\n\`\`\`\n\n`;
									generatedText += text;
									yield {
										token: { id: tokenCount++, text, logprob: 0, special: false },
										generated_text: null,
										details: null,
									};
								}
							}
						}

						currentToolUseId = "";
						currentToolName = "";
						toolInputJson = "";
					} else if (message.type === "assistant") {
						// SDK returns complete assistant messages - extract any missed text blocks
						const assistantMessage = message as {
							type: "assistant";
							message: { content?: Array<{ type: string; text?: string }> };
						};

						const content = assistantMessage.message?.content;
						if (Array.isArray(content)) {
							for (const block of content) {
								if (block.type === "text" && block.text) {
									if (!generatedText.includes(block.text)) {
										const text = block.text;
										generatedText += text;
										yield {
											token: { id: tokenCount++, text, logprob: 0, special: false },
											generated_text: null,
											details: null,
										};
									}
								}
							}
						}
					} else if (message.type === "result") {
						yield {
							token: { id: tokenCount++, text: "", logprob: 0, special: true },
							generated_text: generatedText,
							details: null,
						};
						return;
					}
				}

				if (generatedText) {
					yield {
						token: { id: tokenCount++, text: "", logprob: 0, special: true },
						generated_text: generatedText,
						details: null,
					};
				}
			} catch (error) {
				logger.error({ error, modelId }, "[claude-agent-sdk] Generation error");
				throw error;
			}
		}

		return generate();
	};
}
