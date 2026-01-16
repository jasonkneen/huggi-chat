<script lang="ts">
	import type { Message } from "$lib/types/Message";
	import type { Model } from "$lib/types/Model";
	import type { ToolFront } from "$lib/types/Tool";

	interface Props {
		messages: Message[];
		currentModel: Model;
		preprompt?: string;
		tools?: ToolFront[];
	}

	let { messages, currentModel, preprompt = "", tools = [] }: Props = $props();

	const estimateTokens = (text: string) => Math.ceil((text?.length || 0) / 4);

	// Known context lengths for popular models (from models.dev)
	const MODEL_CONTEXT_LENGTHS: Record<string, number> = {
		// OpenAI models
		"gpt-4o": 128000,
		"gpt-4o-mini": 128000,
		"gpt-4-turbo": 128000,
		"gpt-4": 8192,
		"gpt-4-32k": 32768,
		"gpt-3.5-turbo": 16385,
		"o1": 200000,
		"o1-mini": 128000,
		"o1-preview": 128000,
		"o3-mini": 200000,
		// Anthropic Claude models
		"claude-3-5-sonnet": 200000,
		"claude-3-5-haiku": 200000,
		"claude-3-opus": 200000,
		"claude-3-sonnet": 200000,
		"claude-3-haiku": 200000,
		"claude-sonnet-4": 200000,
		"claude-sonnet-4-5": 200000,
		"claude-opus-4": 200000,
		"claude-opus-4-5": 200000,
		// Google Gemini models
		"gemini-2.0-flash": 1048576,
		"gemini-2.0-flash-exp": 1048576,
		"gemini-1.5-pro": 2097152,
		"gemini-1.5-flash": 1048576,
		"gemini-1.5-flash-8b": 1048576,
		"gemini-pro": 32760,
		// Mistral models
		"mistral-large": 128000,
		"mistral-medium": 32000,
		"mistral-small": 32000,
		"mixtral-8x7b": 32768,
		"mixtral-8x22b": 65536,
		// Llama models
		"llama-3.1-405b": 128000,
		"llama-3.1-70b": 128000,
		"llama-3.1-8b": 128000,
		"llama-3-70b": 8192,
		"llama-3-8b": 8192,
		// DeepSeek models
		"deepseek-v3": 65536,
		"deepseek-chat": 65536,
		"deepseek-coder": 65536,
		// Qwen models
		"qwen-2.5-72b": 131072,
		"qwen-2.5-32b": 131072,
		"qwen-2.5-14b": 131072,
		"qwen-2.5-7b": 131072,
	};

	// Get context length from model config or lookup table
	const getModelContextLength = (model: Model): number => {
		// First check if model has explicit truncate parameter
		if (model.parameters?.truncate) {
			return model.parameters.truncate;
		}

		// Try to match model ID/name against known models
		const modelId = (model.id || model.name || "").toLowerCase();

		// Direct match
		for (const [key, length] of Object.entries(MODEL_CONTEXT_LENGTHS)) {
			if (modelId.includes(key.toLowerCase())) {
				return length;
			}
		}

		// Default fallback
		return 128000;
	};

	const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant with access to tools. You can execute actions, read files, search the web, and perform tasks on behalf of the user.

CRITICAL: You have real tool capabilities. When the user asks you to do something that requires tools (file access, web search, code execution, etc.), USE THE TOOLS. Do not claim you cannot do something if you have a tool for it.

Guidelines:
- Use tools proactively when they help accomplish the user's request
- If a tool fails, explain the error and try an alternative approach
- Be concise and direct in responses
- Use Markdown formatting for clarity`;

	function buildToolPrepromptText(toolList: ToolFront[]): string {
		const currentDate = new Date().toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});

		const lines: string[] = [BASE_SYSTEM_PROMPT, "", `Today's date: ${currentDate}.`];

		if (!toolList.length) return lines.join("\n");

		lines.push("");
		lines.push("# TOOLS YOU CAN USE");
		lines.push("");

		for (const tool of toolList) {
			lines.push(`- **${tool.name}**: ${tool.description || "No description"}`);
		}
		lines.push("");

		lines.push(
			"IMPORTANT: Do NOT say you cannot access files, browse the web, or execute commands. You CAN do these things using the tools above. Use them."
		);

		return lines.join("\n");
	}

	const contextBreakdown = $derived.by(() => {
		// Use model's actual context length from parameters or lookup table
		const maxContext = getModelContextLength(currentModel);

		// System prompt order (matching server-side runMcpFlow.ts):
		// 1. Tool preprompt (MCP instructions + tool list)
		// 2. Conversation preprompt
		// 3. Model preprompt (added last)
		const toolPrepromptText = buildToolPrepromptText(tools);
		const modelPreprompt = currentModel.preprompt || "";

		let systemTokens = 0;
		systemTokens += estimateTokens(toolPrepromptText);
		systemTokens += estimateTokens(preprompt || "");
		systemTokens += estimateTokens(modelPreprompt);

		// Tool JSON schemas sent to API (~250 tokens per tool for parameters schema)
		let toolTokens = tools.length * 250;

		let userTokens = 0;
		let assistantTokens = 0;

		// Track actual tokens from API responses
		let totalActualPromptTokens = 0;
		let totalActualCompletionTokens = 0;
		let hasActualUsage = false;

		for (const msg of messages) {
			const msgOverhead = 10;

			// Check if this message has actual usage data from API
			if (msg.usage) {
				hasActualUsage = true;
				// For assistant messages, use actual completion tokens
				if (msg.from === "assistant") {
					totalActualCompletionTokens += msg.usage.completionTokens;
					// The promptTokens includes all input (system + user + history)
					// We only take the latest one as it's cumulative
					totalActualPromptTokens = msg.usage.promptTokens;
				}
			}

			// Fall back to estimates for messages without usage data
			const contentTokens = estimateTokens(msg.content || "");

			if (msg.from === "user") {
				userTokens += contentTokens + msgOverhead;
				if (msg.files?.length) {
					userTokens += msg.files.length * 1000;
				}
			} else if (msg.from === "assistant") {
				// Only estimate if no actual usage
				if (!msg.usage) {
					assistantTokens += contentTokens + msgOverhead;
					if (msg.reasoning) {
						assistantTokens += estimateTokens(msg.reasoning);
					}
				}
			} else if (msg.from === "system") {
				systemTokens += contentTokens + msgOverhead;
			}

			if (msg.updates) {
				for (const update of msg.updates) {
					if ("subtype" in update && update.subtype) {
						toolTokens += 250;
					}
				}
			}
		}

		// If we have actual usage data, use it for more accurate totals
		if (hasActualUsage) {
			// Use actual prompt tokens (includes system, user, tools, history)
			// and actual completion tokens for assistant output
			const usedTokens = totalActualPromptTokens + totalActualCompletionTokens;
			const spareTokens = Math.max(0, maxContext - usedTokens);

			return {
				system: Math.round(totalActualPromptTokens * 0.2), // Approximate system portion
				user: Math.round(totalActualPromptTokens * 0.6), // Approximate user portion
				assistant: totalActualCompletionTokens,
				tool: Math.round(totalActualPromptTokens * 0.2), // Approximate tool portion
				spare: spareTokens,
				total: maxContext,
				used: usedTokens,
			};
		}

		// Fall back to estimates when no actual usage data
		const usedTokens = systemTokens + userTokens + assistantTokens + toolTokens;
		const spareTokens = Math.max(0, maxContext - usedTokens);

		return {
			system: systemTokens,
			user: userTokens,
			assistant: assistantTokens,
			tool: toolTokens,
			spare: spareTokens,
			total: maxContext,
			used: usedTokens,
		};
	});

	// Calculate percentages for the bar - segments within the USED portion only
	const segments = $derived.by(() => {
		const { system, user, assistant, tool, used } = contextBreakdown;
		// Each segment's percentage is relative to the USED tokens, not total
		const toPercent = (val: number) => (used > 0 ? Math.max(0, (val / used) * 100) : 0);

		return [
			{ name: "System", value: system, percent: toPercent(system), color: "bg-purple-500" },
			{ name: "User", value: user, percent: toPercent(user), color: "bg-blue-500" },
			{
				name: "Assistant",
				value: assistant,
				percent: toPercent(assistant),
				color: "bg-green-500",
			},
			{ name: "Tools", value: tool, percent: toPercent(tool), color: "bg-orange-500" },
		];
	});

	const usagePercent = $derived(Math.round((contextBreakdown.used / contextBreakdown.total) * 100));
</script>

<!-- Context bar with count label -->
<div class="flex flex-1 items-center gap-2">
	<!-- Container fills available space -->
	<div class="relative h-2.5 flex-1">
		<!-- Colored bar: always 100% width, segments show breakdown of used tokens -->
		<div
			class="absolute left-0 top-0 flex h-full w-full overflow-hidden rounded-full opacity-70 transition-all duration-500"
			title="Context: {contextBreakdown.used.toLocaleString()} / {contextBreakdown.total.toLocaleString()} tokens ({usagePercent}%)"
		>
			{#each segments as seg}
				{#if seg.percent > 0}
					<div
						class="{seg.color} h-full cursor-default transition-all duration-300"
						style="width: {seg.percent}%"
						title="{seg.name}: {seg.value.toLocaleString()} tokens"
					></div>
				{/if}
			{/each}
		</div>
	</div>
	<!-- Count label -->
	<span
		class="whitespace-nowrap text-xs tabular-nums text-gray-500 dark:text-gray-400"
	>
		{(contextBreakdown.used / 1000).toFixed(1)}k/{(contextBreakdown.total / 1000).toFixed(0)}k
		<span
			class="font-semibold"
			class:text-red-500={usagePercent > 90}
			class:text-orange-500={usagePercent > 70 && usagePercent <= 90}
		>
			({usagePercent}%)
		</span>
	</span>
</div>

<style>
	/* Remove gaps between segments for seamless bar */
	div > div {
		margin: 0;
	}
</style>
