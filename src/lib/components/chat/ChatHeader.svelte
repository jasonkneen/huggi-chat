<script lang="ts">
	import { page } from "$app/state";
	import { allWorkspaces, conversationWorkspaces } from "$lib/stores/workspaces";
	import LucideTerminal from "~icons/lucide/terminal";
	import LucideCopy from "~icons/lucide/copy";
	import LucideChevronRight from "~icons/lucide/chevron-right";

	interface Props {
		title?: string;
	}

	let { title }: Props = $props();

	// Get conversation ID from URL
	function getConversationId(): string | null {
		const match = page.url.pathname.match(/\/conversation\/([^/]+)/);
		return match ? match[1] : null;
	}

	// Get workspaces for current conversation
	const currentConvWorkspaceIds = $derived.by(() => {
		const convId = getConversationId();
		if (!convId) return [];
		return $conversationWorkspaces[convId] ?? [];
	});

	const currentWorkspaces = $derived.by(() => {
		return $allWorkspaces.filter((w) => currentConvWorkspaceIds.includes(w.id));
	});

	// Get primary workspace name (first one)
	const workspaceName = $derived(currentWorkspaces[0]?.name ?? "Chat");

	// Copy title to clipboard
	function copyTitle() {
		if (title) {
			navigator.clipboard.writeText(title);
		}
	}
</script>

<div
	class="flex h-10 items-center justify-between border-b border-gray-200/50 bg-gray-50/50 px-4 dark:border-gray-700/50 dark:bg-gray-900/30"
>
	<!-- Breadcrumb -->
	<div class="flex items-center gap-1 text-sm">
		<span class="font-medium text-gray-700 dark:text-gray-300">{workspaceName}</span>
		{#if title}
			<LucideChevronRight class="size-3.5 text-gray-400" />
			<span class="truncate text-gray-500 dark:text-gray-400" title={title}>{title}</span>
		{/if}
	</div>

	<!-- Action buttons -->
	<div class="flex items-center gap-1">
		<button
			type="button"
			class="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
			title="Open terminal"
		>
			<LucideTerminal class="size-4" />
		</button>
		<button
			type="button"
			class="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
			title="Copy conversation title"
			onclick={copyTitle}
		>
			<LucideCopy class="size-4" />
		</button>
	</div>
</div>
