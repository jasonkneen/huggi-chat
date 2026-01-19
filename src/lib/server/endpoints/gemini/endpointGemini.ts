import { z } from "zod";
import type { Endpoint } from "../endpoints";
import type { TextGenerationStreamOutput } from "@huggingface/inference";
import { config } from "$lib/server/config";
import { createImageProcessorOptionsValidator, makeImageProcessor } from "../images";
import { prepareMessagesWithFiles } from "$lib/server/textGeneration/utils/prepareFiles";

export const endpointGeminiParametersSchema = z.object({
	weight: z.number().int().positive().default(1),
	model: z.any(),
	type: z.literal("gemini"),
	apiKey: z.string().default(config.GEMINI_API_KEY || ""),
	baseURL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta/models"),
	multimodal: z
		.object({
			image: createImageProcessorOptionsValidator({
				supportedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
				preferredMimeType: "image/jpeg",
				maxSizeInMB: 4,
				maxWidth: 2048,
				maxHeight: 2048,
			}),
		})
		.default({}),
});

interface GeminiContent {
	role: "user" | "model";
	parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

interface GeminiStreamChunk {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string; thought?: boolean }>;
			role?: string;
		};
		finishReason?: string;
	}>;
	usageMetadata?: {
		promptTokenCount: number;
		candidatesTokenCount: number;
		thoughtsTokenCount?: number;
		totalTokenCount: number;
	};
}

export async function endpointGemini(
	input: z.input<typeof endpointGeminiParametersSchema>
): Promise<Endpoint> {
	const { baseURL, apiKey: configApiKey, model, multimodal } = endpointGeminiParametersSchema.parse(input);

	const imageProcessor = makeImageProcessor(multimodal.image);

	return async ({ messages, preprompt, generateSettings, isMultimodal, abortSignal, locals }) => {
		// Read API key at request time (not build time) to pick up keys saved after startup
		const apiKey = configApiKey || process.env.GEMINI_API_KEY || "";

		if (!apiKey) {
			throw new Error("Gemini API key is required. Set it in Settings > Providers or as GEMINI_API_KEY environment variable.");
		}
		// Convert messages to Gemini format
		const geminiContents: GeminiContent[] = [];

		// Process messages with files if multimodal
		const processedMessages = await prepareMessagesWithFiles(
			messages,
			imageProcessor,
			isMultimodal ?? model.multimodal
		);

		// Add system instruction via preprompt
		let systemInstruction: string | undefined;
		if (preprompt && preprompt.trim()) {
			systemInstruction = preprompt.trim();
		}

		// Convert OpenAI-style messages to Gemini format
		for (const msg of processedMessages) {
			if (msg.role === "system") {
				// Gemini handles system via systemInstruction
				if (!systemInstruction) {
					systemInstruction =
						typeof msg.content === "string"
							? msg.content
							: msg.content
									.filter((p) => p.type === "text")
									.map((p) => (p as { type: "text"; text: string }).text)
									.join("\n");
				}
				continue;
			}

			const role = msg.role === "assistant" ? "model" : "user";
			const parts: GeminiContent["parts"] = [];

			if (typeof msg.content === "string") {
				parts.push({ text: msg.content });
			} else if (Array.isArray(msg.content)) {
				for (const part of msg.content) {
					if (part.type === "text") {
						parts.push({ text: part.text });
					} else if (part.type === "image_url" && part.image_url?.url) {
						// Handle base64 images
						const url = part.image_url.url;
						if (url.startsWith("data:")) {
							const match = url.match(/^data:([^;]+);base64,(.+)$/);
							if (match) {
								parts.push({
									inlineData: {
										mimeType: match[1],
										data: match[2],
									},
								});
							}
						}
					}
				}
			}

			if (parts.length > 0) {
				geminiContents.push({ role, parts });
			}
		}

		// Build request body
		const parameters = { ...model.parameters, ...generateSettings };

		// Get thinking level from locals
		const thinkingLevel = (locals as unknown as Record<string, unknown>)?.thinkingLevel as
			| number
			| undefined;

		// Map thinking level to Gemini thinkingBudget (for 2.5 models) or thinkingLevel (for 3.x models)
		// Level 0 = off, 1-4 = increasing thinking budget
		const thinkingBudgetMap: Record<number, number> = {
			0: 0,      // Disabled
			1: 1024,   // Low
			2: 4096,   // Medium
			3: 16384,  // High
			4: -1,     // Dynamic (max)
		};

		const modelId = model.id ?? model.name;
		const isGemini3 = modelId.includes("gemini-3");
		const enableThinking = thinkingLevel !== undefined && thinkingLevel > 0;

		const generationConfig: Record<string, unknown> = {
			temperature: parameters?.temperature,
			topP: parameters?.top_p,
			maxOutputTokens: parameters?.max_tokens,
			stopSequences: parameters?.stop,
		};

		// Add thinking configuration based on model version
		if (enableThinking) {
			if (isGemini3) {
				// Gemini 3 uses thinkingLevel: "low" | "medium" | "high"
				const levelNames = ["low", "low", "medium", "high", "high"];
				generationConfig.thinkingLevel = levelNames[thinkingLevel] || "high";
			} else {
				// Gemini 2.5 uses thinkingBudget (number of tokens or -1 for dynamic)
				generationConfig.thinkingBudget = thinkingBudgetMap[thinkingLevel] ?? -1;
			}
		}

		const requestBody: Record<string, unknown> = {
			contents: geminiContents,
			generationConfig,
			// Enable thought summaries in response when thinking is on
			...(enableThinking && { includeThoughts: true }),
		};

		if (systemInstruction) {
			requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
		}

		const url = `${baseURL}/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
			signal: abortSignal,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Gemini API error: ${response.status} ${errorText}`);
		}

		if (!response.body) {
			throw new Error("No response body from Gemini API");
		}

		return geminiStreamToTextGeneration(response.body);
	};
}

async function* geminiStreamToTextGeneration(body: ReadableStream<Uint8Array>): AsyncGenerator<
	TextGenerationStreamOutput & {
		usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
	},
	void,
	void
> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let generatedText = "";
	let tokenId = 0;
	let usageData: { promptTokens: number; completionTokens: number; totalTokens: number } | null =
		null;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// Process SSE events
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;

				const jsonStr = line.slice(6).trim();
				if (!jsonStr || jsonStr === "[DONE]") continue;

				try {
					const chunk: GeminiStreamChunk = JSON.parse(jsonStr);

					// Extract usage metadata
					if (chunk.usageMetadata) {
						usageData = {
							promptTokens: chunk.usageMetadata.promptTokenCount,
							completionTokens: chunk.usageMetadata.candidatesTokenCount,
							totalTokens: chunk.usageMetadata.totalTokenCount,
						};
					}

					// Extract content from all parts (may include thinking and text)
					const candidate = chunk.candidates?.[0];
					const parts = candidate?.content?.parts || [];
					const isLast = candidate?.finishReason === "STOP";

					for (const part of parts) {
						const text = part.text || "";
						if (!text) continue;

						// Wrap thinking content in <think> tags for UI detection
						const outputText = part.thought ? `<think>${text}</think>` : text;

						generatedText += outputText;
						yield {
							token: {
								id: tokenId++,
								text: outputText,
								logprob: 0,
								special: false,
							},
							generated_text: isLast ? generatedText : null,
							details: null,
						};
					}

					// Yield final with generated text
					if (isLast && !text) {
						yield {
							token: {
								id: tokenId++,
								text: "",
								logprob: 0,
								special: true,
							},
							generated_text: generatedText,
							details: null,
						};
					}
				} catch {
					// Skip malformed JSON
				}
			}
		}

		// Yield usage data at the end
		if (usageData) {
			yield {
				token: {
					id: tokenId++,
					text: "",
					logprob: 0,
					special: true,
				},
				generated_text: null,
				details: null,
				usage: usageData,
			};
		}
	} finally {
		reader.releaseLock();
	}
}
