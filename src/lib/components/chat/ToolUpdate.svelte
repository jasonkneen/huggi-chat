<script lang="ts">
	import { MessageToolUpdateType, type MessageToolUpdate } from "$lib/types/MessageUpdate";
	import {
		isMessageToolCallUpdate,
		isMessageToolErrorUpdate,
		isMessageToolProgressUpdate,
		isMessageToolResultUpdate,
	} from "$lib/utils/messageUpdates";
	import { formatToolProgressLabel } from "$lib/utils/toolProgress";
	import LucideCheck from "~icons/lucide/check";
	import LucideX from "~icons/lucide/x";
	import LucideTerminal from "~icons/lucide/terminal";
	import LucideFileText from "~icons/lucide/file-text";
	import LucideEdit from "~icons/lucide/edit";
	import LucideFolderSearch from "~icons/lucide/folder-search";
	import LucideSearch from "~icons/lucide/search";
	import LucideGlobe from "~icons/lucide/globe";
	import LucideWrench from "~icons/lucide/wrench";
	import { ToolResultStatus, type ToolFront } from "$lib/types/Tool";
	import { page } from "$app/state";
	import CarbonChevronDown from "~icons/carbon/chevron-down";

	interface Props {
		tool: MessageToolUpdate[];
		loading?: boolean;
		hasNext?: boolean;
	}

	let { tool, loading = false }: Props = $props();

	let isOpen = $state(false);

	let toolFnName = $derived(tool.find(isMessageToolCallUpdate)?.call.name);
	let toolError = $derived(tool.some(isMessageToolErrorUpdate));
	let toolDone = $derived(tool.some(isMessageToolResultUpdate));
	let isExecuting = $derived(!toolDone && !toolError && loading);
	let toolSuccess = $derived(toolDone && !toolError);
	let toolProgress = $derived.by(() => {
		for (let i = tool.length - 1; i >= 0; i -= 1) {
			const update = tool[i];
			if (isMessageToolProgressUpdate(update)) return update;
		}
		return undefined;
	});
	let progressLabel = $derived.by(() => formatToolProgressLabel(toolProgress));

	const availableTools: ToolFront[] = $derived.by(
		() => (page.data as { tools?: ToolFront[] } | undefined)?.tools ?? []
	);

	// Tool type color mapping
	const toolColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
		bash: {
			bg: "bg-blue-50 dark:bg-blue-900/30",
			text: "text-blue-700 dark:text-blue-300",
			border: "border-blue-200 dark:border-blue-700",
			icon: "text-blue-500 dark:text-blue-400",
		},
		read: {
			bg: "bg-emerald-50 dark:bg-emerald-900/30",
			text: "text-emerald-700 dark:text-emerald-300",
			border: "border-emerald-200 dark:border-emerald-700",
			icon: "text-emerald-500 dark:text-emerald-400",
		},
		write: {
			bg: "bg-amber-50 dark:bg-amber-900/30",
			text: "text-amber-700 dark:text-amber-300",
			border: "border-amber-200 dark:border-amber-700",
			icon: "text-amber-500 dark:text-amber-400",
		},
		edit: {
			bg: "bg-orange-50 dark:bg-orange-900/30",
			text: "text-orange-700 dark:text-orange-300",
			border: "border-orange-200 dark:border-orange-700",
			icon: "text-orange-500 dark:text-orange-400",
		},
		glob: {
			bg: "bg-violet-50 dark:bg-violet-900/30",
			text: "text-violet-700 dark:text-violet-300",
			border: "border-violet-200 dark:border-violet-700",
			icon: "text-violet-500 dark:text-violet-400",
		},
		grep: {
			bg: "bg-pink-50 dark:bg-pink-900/30",
			text: "text-pink-700 dark:text-pink-300",
			border: "border-pink-200 dark:border-pink-700",
			icon: "text-pink-500 dark:text-pink-400",
		},
		web: {
			bg: "bg-cyan-50 dark:bg-cyan-900/30",
			text: "text-cyan-700 dark:text-cyan-300",
			border: "border-cyan-200 dark:border-cyan-700",
			icon: "text-cyan-500 dark:text-cyan-400",
		},
		default: {
			bg: "bg-gray-50 dark:bg-gray-800/50",
			text: "text-gray-700 dark:text-gray-300",
			border: "border-gray-200 dark:border-gray-700",
			icon: "text-gray-500 dark:text-gray-400",
		},
	};

	// Get tool type from name for color mapping
	const getToolType = (name: string | undefined): string => {
		if (!name) return "default";
		const lower = name.toLowerCase();
		if (lower.includes("bash") || lower.includes("shell") || lower.includes("terminal"))
			return "bash";
		if (lower.includes("read") || lower.includes("file")) return "read";
		if (lower.includes("write") || lower.includes("create")) return "write";
		if (lower.includes("edit") || lower.includes("modify") || lower.includes("update"))
			return "edit";
		if (lower.includes("glob") || lower.includes("find") || lower.includes("ls")) return "glob";
		if (lower.includes("grep") || lower.includes("search")) return "grep";
		if (lower.includes("web") || lower.includes("fetch") || lower.includes("http")) return "web";
		return "default";
	};

	let toolType = $derived(getToolType(toolFnName));
	let colors = $derived(toolColors[toolType] ?? toolColors.default);

	// Get icon component based on tool type
	const getToolIcon = (type: string) => {
		switch (type) {
			case "bash":
				return LucideTerminal;
			case "read":
				return LucideFileText;
			case "write":
				return LucideFileText;
			case "edit":
				return LucideEdit;
			case "glob":
				return LucideFolderSearch;
			case "grep":
				return LucideSearch;
			case "web":
				return LucideGlobe;
			default:
				return LucideWrench;
		}
	};

	let ToolIcon = $derived(getToolIcon(toolType));

	type ToolOutput = Record<string, unknown>;
	type McpImageContent = {
		type: "image";
		data: string;
		mimeType: string;
	};

	const formatValue = (value: unknown): string => {
		if (value == null) return "";
		if (typeof value === "object") {
			try {
				return JSON.stringify(value, null, 2);
			} catch {
				return String(value);
			}
		}
		return String(value);
	};

	const getOutputText = (output: ToolOutput): string | undefined => {
		const maybeText = output["text"];
		if (typeof maybeText !== "string") return undefined;
		return maybeText;
	};

	const isImageBlock = (value: unknown): value is McpImageContent => {
		if (typeof value !== "object" || value === null) return false;
		const obj = value as Record<string, unknown>;
		return (
			obj["type"] === "image" &&
			typeof obj["data"] === "string" &&
			typeof obj["mimeType"] === "string"
		);
	};

	const getImageBlocks = (output: ToolOutput): McpImageContent[] => {
		const blocks = output["content"];
		if (!Array.isArray(blocks)) return [];
		return blocks.filter(isImageBlock);
	};

	const getMetadataEntries = (output: ToolOutput): Array<[string, unknown]> => {
		return Object.entries(output).filter(
			([key, value]) => value != null && key !== "content" && key !== "text"
		);
	};

	interface ParsedToolOutput {
		text?: string;
		images: McpImageContent[];
		metadata: Array<[string, unknown]>;
	}

	const parseToolOutputs = (outputs: ToolOutput[]): ParsedToolOutput[] =>
		outputs.map((output) => ({
			text: getOutputText(output),
			images: getImageBlocks(output),
			metadata: getMetadataEntries(output),
		}));

	let displayName = $derived(
		availableTools.find((entry) => entry.name === toolFnName)?.displayName ?? toolFnName
	);
</script>

{#if toolFnName}
	<div class="inline-block">
		<!-- Chip -->
		<button
			type="button"
			class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:shadow-sm {colors.bg} {colors.border} {colors.text} {isOpen
				? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900'
				: ''}"
			style={isOpen ? `--tw-ring-color: var(--tw-${toolType === 'default' ? 'gray' : toolType}-300)` : ''}
			onclick={() => (isOpen = !isOpen)}
		>
			<!-- Icon: spinning while executing, tick/cross when done -->
			{#if isExecuting}
				<svelte:component this={ToolIcon} class="size-3.5 animate-spin {colors.icon}" />
			{:else if toolError}
				<LucideX class="size-3.5 {colors.icon}" />
			{:else if toolSuccess}
				<LucideCheck class="size-3.5 {colors.icon}" />
			{:else}
				<svelte:component this={ToolIcon} class="size-3.5 {colors.icon}" />
			{/if}

			<!-- Tool name -->
			<span class="max-w-[120px] truncate">{displayName}</span>

			<!-- Progress indicator -->
			{#if isExecuting && toolProgress}
				<span class="text-[10px] opacity-70">({progressLabel})</span>
			{/if}

			<!-- Expand indicator -->
			<CarbonChevronDown
				class="size-3 opacity-50 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
			/>
		</button>

		<!-- Expanded details (below chip) -->
		{#if isOpen}
			<div
				class="mt-2 w-full max-w-xl rounded-lg border bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
			>
				<div class="space-y-3">
					{#each tool as update, i (`${update.subtype}-${i}`)}
						{#if update.subtype === MessageToolUpdateType.Call}
							<div class="space-y-1">
								<div
									class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
								>
									Input
								</div>
								<div
									class="rounded-md border border-gray-100 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400"
								>
									<pre class="whitespace-pre-wrap break-all font-mono text-xs">{formatValue(
											update.call.parameters
										)}</pre>
								</div>
							</div>
						{:else if update.subtype === MessageToolUpdateType.Error}
							<div class="space-y-1">
								<div
									class="text-[10px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-400"
								>
									Error
								</div>
								<div
									class="rounded-md border border-red-200 bg-red-50 p-2 text-red-600 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-400"
								>
									<pre class="whitespace-pre-wrap break-all font-mono text-xs">{update.message}</pre>
								</div>
							</div>
						{:else if isMessageToolResultUpdate(update) && update.result.status === ToolResultStatus.Success && update.result.display}
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div
										class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
									>
										Output
									</div>
									<LucideCheck class="size-3 text-emerald-500" />
								</div>
								<div
									class="scrollbar-custom rounded-md border border-gray-100 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400"
								>
									{#each parseToolOutputs(update.result.outputs) as parsedOutput}
										<div class="space-y-2">
											{#if parsedOutput.text}
												<pre
													class="scrollbar-custom max-h-60 overflow-y-auto whitespace-pre-wrap break-all font-mono text-xs">{parsedOutput.text}</pre>
											{/if}

											{#if parsedOutput.images.length > 0}
												<div class="flex flex-wrap gap-2">
													{#each parsedOutput.images as image, imageIndex}
														<img
															alt={`Tool result image ${imageIndex + 1}`}
															class="max-h-60 rounded border border-gray-200 dark:border-gray-700"
															src={`data:${image.mimeType};base64,${image.data}`}
														/>
													{/each}
												</div>
											{/if}

											{#if parsedOutput.metadata.length > 0}
												<pre
													class="scrollbar-custom max-h-60 overflow-y-auto whitespace-pre-wrap break-all font-mono text-xs">{formatValue(
														Object.fromEntries(parsedOutput.metadata)
													)}</pre>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{:else if isMessageToolResultUpdate(update) && update.result.status === ToolResultStatus.Error && update.result.display}
							<div class="space-y-1">
								<div
									class="text-[10px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-400"
								>
									Error
								</div>
								<div
									class="rounded-md border border-red-200 bg-red-50 p-2 text-red-600 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-400"
								>
									<pre class="whitespace-pre-wrap break-all font-mono text-xs">{update.result
											.message}</pre>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
