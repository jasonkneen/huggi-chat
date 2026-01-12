<script lang="ts">
	import type { AtMentionItem } from "$lib/utils/atMentions";
	import IconUser from "~icons/lucide/user";
	import IconFile from "~icons/lucide/file";

	interface Props {
		items: AtMentionItem[];
		selectedIndex: number;
		onselect: (item: AtMentionItem) => void;
		onclose: () => void;
	}

	let { items, selectedIndex, onselect, onclose }: Props = $props();

	function getTypeIcon(type: AtMentionItem["type"]) {
		return type === "agent" ? IconUser : IconFile;
	}
</script>

<div
	class="absolute bottom-full left-0 z-50 mb-2 max-h-64 w-80 overflow-y-auto rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/95"
	role="listbox"
>
	{#if items.length === 0}
		<div class="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
			No matching agents
		</div>
	{:else}
		{#each items as item, i (item.path)}
			{@const Icon = getTypeIcon(item.type)}
			<button
				type="button"
				role="option"
				aria-selected={i === selectedIndex}
				class={[
					"flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/10",
					i === selectedIndex && "bg-gray-100 dark:bg-white/10",
				]}
				onclick={() => onselect(item)}
			>
				<div class="mt-0.5 flex size-5 items-center justify-center text-gray-400">
					<Icon class="size-4" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="font-medium text-gray-900 dark:text-gray-100">@{item.name}</span>
						<span
							class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
						>
							Agent
						</span>
					</div>
					{#if item.description}
						<p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
							{item.description}
						</p>
					{/if}
				</div>
			</button>
		{/each}
	{/if}
	<div
		class="border-t border-gray-200 px-3 py-1.5 text-[10px] text-gray-400 dark:border-gray-700 dark:text-gray-500"
	>
		<kbd class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">Up/Down</kbd> navigate
		<kbd class="ml-2 rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">Enter</kbd> select
		<kbd class="ml-2 rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">Esc</kbd> close
	</div>
</div>
