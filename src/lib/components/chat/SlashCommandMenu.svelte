<script lang="ts">
	import type { SlashCommand } from "$lib/utils/slashCommands";

	interface Props {
		commands: SlashCommand[];
		selectedIndex: number;
		onselect: (command: SlashCommand) => void;
		onclose: () => void;
	}

	let { commands, selectedIndex, onselect, onclose }: Props = $props();

	function getSourceBadge(source: SlashCommand["source"]): string {
		switch (source) {
			case "builtin":
				return "Built-in";
			case "user":
				return "User";
			case "skill":
				return "Skill";
			default:
				return "";
		}
	}

	function getSourceColor(source: SlashCommand["source"]): string {
		switch (source) {
			case "builtin":
				return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
			case "user":
				return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
			case "skill":
				return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
			default:
				return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
		}
	}
</script>

<div
	class="absolute bottom-full left-0 z-50 mb-2 max-h-64 w-80 overflow-y-auto rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/95"
	role="listbox"
>
	{#if commands.length === 0}
		<div class="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
			No matching commands
		</div>
	{:else}
		{#each commands as command, i (command.name)}
			<button
				type="button"
				role="option"
				aria-selected={i === selectedIndex}
				class={[
					"flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/10",
					i === selectedIndex && "bg-gray-100 dark:bg-white/10",
				]}
				onclick={() => onselect(command)}
			>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="font-medium text-gray-900 dark:text-gray-100">/{command.name}</span>
						<span
							class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {getSourceColor(
								command.source
							)}"
						>
							{getSourceBadge(command.source)}
						</span>
					</div>
					<p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
						{command.description}
					</p>
				</div>
			</button>
		{/each}
	{/if}
	<div
		class="border-t border-gray-200 px-3 py-1.5 text-[10px] text-gray-400 dark:border-gray-700 dark:text-gray-500"
	>
		<kbd class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">↑↓</kbd> navigate
		<kbd class="ml-2 rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">Enter</kbd> select
		<kbd class="ml-2 rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">Esc</kbd> close
	</div>
</div>
