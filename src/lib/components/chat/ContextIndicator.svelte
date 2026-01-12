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
		const maxContext = currentModel.parameters?.truncate ?? 128000;

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

		for (const msg of messages) {
			const contentTokens = estimateTokens(msg.content || "");
			const msgOverhead = 10;

			if (msg.from === "user") {
				userTokens += contentTokens + msgOverhead;
				if (msg.files?.length) {
					userTokens += msg.files.length * 1000;
				}
			} else if (msg.from === "assistant") {
				assistantTokens += contentTokens + msgOverhead;
				if (msg.reasoning) {
					assistantTokens += estimateTokens(msg.reasoning);
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
		<!-- Colored bar: width = % used, colors fill it -->
		<div
			class="absolute left-0 top-0 flex h-full overflow-hidden rounded-full transition-all duration-500"
			style="width: {usagePercent}%; min-width: 12px;"
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
