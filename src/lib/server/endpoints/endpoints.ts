import type { Conversation } from "$lib/types/Conversation";
import type { Message } from "$lib/types/Message";
import type {
	TextGenerationStreamOutput,
	TextGenerationStreamToken,
	InferenceProvider,
} from "@huggingface/inference";
import { z } from "zod";
import { endpointOAIParametersSchema, endpointOai } from "./openai/endpointOai";
import {
	endpointClaudeAgentSdkParametersSchema,
	endpointClaudeAgentSdk,
} from "./claudeAgentSdk/endpointClaudeAgentSdk";
import { endpointGeminiParametersSchema, endpointGemini } from "./gemini/endpointGemini";
import type { Model } from "$lib/types/Model";
import type { ObjectId } from "mongodb";

export type EndpointMessage = Omit<Message, "id">;

export interface EndpointParameters {
	messages: EndpointMessage[];
	preprompt?: Conversation["preprompt"];
	generateSettings?: Partial<Model["parameters"]>;
	isMultimodal?: boolean;
	conversationId?: ObjectId;
	locals: App.Locals | undefined;
	abortSignal?: AbortSignal;
}

export type TextGenerationStreamOutputSimplified = TextGenerationStreamOutput & {
	token: TextGenerationStreamToken;
	routerMetadata?: { route?: string; model?: string; provider?: InferenceProvider };
};

export type Endpoint = (
	params: EndpointParameters
) => Promise<AsyncGenerator<TextGenerationStreamOutputSimplified, void, void>>;

export const endpoints = {
	openai: endpointOai,
	"claude-agent-sdk": endpointClaudeAgentSdk,
	gemini: endpointGemini,
};

export const endpointSchema = z.discriminatedUnion("type", [
	endpointOAIParametersSchema,
	endpointClaudeAgentSdkParametersSchema,
	endpointGeminiParametersSchema,
]);
export default endpoints;
