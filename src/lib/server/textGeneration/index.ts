import { preprocessMessages } from "../endpoints/preprocessMessages";

import { generateTitleForConversation } from "./title";
import {
	type MessageUpdate,
	MessageUpdateType,
	MessageUpdateStatus,
} from "$lib/types/MessageUpdate";
import { generate } from "./generate";
import { generateClaudeAgentSdk } from "./generateClaudeAgentSdk";
import { runMcpFlow } from "./mcp/runMcpFlow";
import { mergeAsyncGenerators } from "$lib/utils/mergeAsyncGenerators";
import type { TextGenerationContext } from "./types";

async function* keepAlive(done: AbortSignal): AsyncGenerator<MessageUpdate, undefined, undefined> {
	while (!done.aborted) {
		yield {
			type: MessageUpdateType.Status,
			status: MessageUpdateStatus.KeepAlive,
		};
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}

export async function* textGeneration(ctx: TextGenerationContext) {
	const done = new AbortController();

	const titleGen = generateTitleForConversation(ctx.conv, ctx.locals);
	const textGen = textGenerationWithoutTitle(ctx, done);
	const keepAliveGen = keepAlive(done.signal);

	// keep alive until textGen is done

	yield* mergeAsyncGenerators([titleGen, textGen, keepAliveGen]);
}

async function* textGenerationWithoutTitle(
	ctx: TextGenerationContext,
	done: AbortController
): AsyncGenerator<MessageUpdate, undefined, undefined> {
	yield {
		type: MessageUpdateType.Status,
		status: MessageUpdateStatus.Started,
	};

	const { conv, messages } = ctx;
	const convId = conv._id;

	const preprompt = conv.preprompt;

	const processedMessages = await preprocessMessages(messages, convId);

	const endpointType = ctx.model.endpoints?.[0]?.type;
	if (endpointType === "claude-agent-sdk") {
		yield* generateClaudeAgentSdk({ ...ctx, messages: processedMessages }, preprompt);
		done.abort();
		return;
	}

	try {
		const mcpGen = runMcpFlow({
			model: ctx.model,
			conv,
			messages: processedMessages,
			assistant: ctx.assistant,
			forceMultimodal: ctx.forceMultimodal,
			forceTools: ctx.forceTools,
			locals: ctx.locals,
			preprompt,
			abortSignal: ctx.abortController.signal,
		});

		let step = await mcpGen.next();
		while (!step.done) {
			yield step.value;
			step = await mcpGen.next();
		}
		const didRunMcp = Boolean(step.value);
		if (!didRunMcp) {
			yield* generate({ ...ctx, messages: processedMessages }, preprompt);
		}
	} catch {
		yield* generate({ ...ctx, messages: processedMessages }, preprompt);
	}
	done.abort();
}
