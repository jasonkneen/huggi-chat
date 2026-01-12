<script lang="ts">
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import type { Workspace } from "$lib/stores/workspaces";
	import NavConversationItem from "./NavConversationItem.svelte";
	import IconChevronDown from "~icons/carbon/chevron-down";
	import IconChevronRight from "~icons/carbon/chevron-right";
	import IconFolder from "~icons/carbon/folder";
	import IconClose from "~icons/carbon/close";

	interface Props {
		workspace: Workspace | null;
		conversations: ConvSidebar[];
		isCollapsed: boolean;
		onToggle: () => void;
		onRemove?: () => void;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
	}

	let {
		workspace,
		conversations,
		isCollapsed,
		onToggle,
		onRemove,
		ondeleteConversation,
		oneditConversationTitle,
	}: Props = $props();

	const title = $derived(workspace?.name ?? "No Workspace");
</script>

<div class="mb-2">
	<button
		onclick={onToggle}
		class="group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
	>
		{#if isCollapsed}
			<IconChevronRight class="size-3.5 flex-shrink-0 text-gray-400" />
		{:else}
			<IconChevronDown class="size-3.5 flex-shrink-0 text-gray-400" />
		{/if}
		<IconFolder class="size-3.5 flex-shrink-0 text-gray-400" />
		<span class="flex-1 truncate">{title}</span>
		<span class="text-xs text-gray-400">{conversations.length}</span>
		{#if workspace && onRemove}
			<button
				onclick={(e) => {
					e.stopPropagation();
					onRemove?.();
				}}
				class="hidden rounded p-0.5 text-gray-400 group-hover:block hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
				title="Remove workspace"
			>
				<IconClose class="size-3" />
			</button>
		{/if}
	</button>

	{#if !isCollapsed && conversations.length > 0}
		<div class="ml-3 mt-1 flex flex-col gap-0.5 border-l border-gray-200 pl-2 dark:border-gray-700">
			{#each conversations as conv}
				<NavConversationItem {conv} {oneditConversationTitle} {ondeleteConversation} />
			{/each}
		</div>
	{/if}

	{#if !isCollapsed && conversations.length === 0}
		<div class="ml-6 mt-1 py-2 text-xs text-gray-400 dark:text-gray-500">No conversations yet</div>
	{/if}
</div>
