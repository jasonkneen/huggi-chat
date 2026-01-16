import type { InferenceProvider } from "@huggingface/inference";
import type { MessageUpdate } from "./MessageUpdate";
import type { Timestamps } from "./Timestamps";
import type { v4 } from "uuid";

export type MessageUsage = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	cost?: number; // Cost in USD (if pricing available)
};

export type Message = Partial<Timestamps> & {
	from: "user" | "assistant" | "system";
	id: ReturnType<typeof v4>;
	content: string;
	updates?: MessageUpdate[];

	// Optional server or client-side reasoning content (<think> blocks)
	reasoning?: string;
	score?: -1 | 0 | 1;
	/**
	 * Either contains the base64 encoded image data
	 * or the hash of the file stored on the server
	 **/
	files?: MessageFile[];
	interrupted?: boolean;

	// Router metadata when using llm-router
	routerMetadata?: {
		route: string;
		model: string;
		provider?: InferenceProvider;
	};

	// API usage data (actual tokens from API response)
	usage?: MessageUsage;

	// needed for conversation trees
	ancestors?: Message["id"][];

	// goes one level deep
	children?: Message["id"][];
};

export type MessageFile = {
	type: "hash" | "base64";
	name: string;
	value: string;
	mime: string;
};
