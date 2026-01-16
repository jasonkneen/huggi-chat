<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";

	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonEdit from "~icons/carbon/edit";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";

	import EditConversationModal from "$lib/components/EditConversationModal.svelte";
	import DeleteConversationModal from "$lib/components/DeleteConversationModal.svelte";
	import { requireAuthUser } from "$lib/utils/auth";
	import { workspaces } from "$lib/stores/workspaces";

	interface Props {
		conv: ConvSidebar;
		readOnly?: true;
		workspaceId?: string;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
	}

	let { conv, readOnly, workspaceId, ondeleteConversation, oneditConversationTitle }: Props = $props();

	function handleClick() {
		// If this conversation belongs to a workspace, set it as active
		if (workspaceId) {
			workspaces.setActiveWorkspace(workspaceId);
		}
	}

	let deleteOpen = $state(false);
	let renameOpen = $state(false);

	// Determine dot color based on conversation age/activity
	const isSelected = $derived(conv.id === page.params.id);
	const isRecent = $derived(Date.now() - conv.updatedAt.getTime() < 1000 * 60 * 60 * 24); // 24 hours
</script>

<a
	data-sveltekit-noscroll
	data-sveltekit-preload-data="tap"
	href="{base}/conversation/{conv.id}"
	onclick={handleClick}
	class="group relative flex min-h-[2.5rem] flex-none items-start gap-2.5 rounded-lg px-2 py-2 transition-colors
		{isSelected
		? 'bg-gray-100/80 dark:bg-gray-700/60'
		: 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
>
	<!-- Status dot -->
	<div
		class="mt-1.5 size-2 flex-shrink-0 rounded-full transition-colors
			{isSelected
			? 'bg-green-400'
			: isRecent
				? 'bg-green-400/70'
				: 'bg-gray-400/50 dark:bg-gray-500/50'}"
	></div>

	<!-- Title - allows wrapping, truncates with ellipsis after 2 lines -->
	<div
		class="min-w-0 flex-1 text-sm leading-snug first-letter:uppercase
			{isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}"
	>
		<span class="line-clamp-2">{conv.title}</span>
	</div>

	<!-- Action buttons - shown on hover -->
	{#if !readOnly}
		<div
			class="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
		>
			<button
				type="button"
				class="flex size-6 items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
				title="Edit conversation title"
				onclick={(e) => {
					e.preventDefault();
					if (requireAuthUser()) return;
					renameOpen = true;
				}}
			>
				<CarbonEdit class="size-3 text-gray-500 dark:text-gray-400" />
			</button>

			<button
				type="button"
				class="flex size-6 items-center justify-center rounded-md bg-gray-100 hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-900/50"
				title="Delete conversation"
				onclick={(event) => {
					event.preventDefault();
					if (requireAuthUser()) return;
					if (event.shiftKey) {
						ondeleteConversation?.(conv.id.toString());
					} else {
						deleteOpen = true;
					}
				}}
			>
				<CarbonTrashCan
					class="size-3 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
				/>
			</button>
		</div>
	{/if}
</a>

<!-- Edit title modal -->
{#if renameOpen}
	<EditConversationModal
		open={renameOpen}
		title={conv.title}
		onclose={() => (renameOpen = false)}
		onsave={(payload) => {
			renameOpen = false;
			oneditConversationTitle?.({ id: conv.id.toString(), title: payload.title });
		}}
	/>
{/if}

<!-- Delete confirmation modal -->
{#if deleteOpen}
	<DeleteConversationModal
		open={deleteOpen}
		title={conv.title}
		onclose={() => (deleteOpen = false)}
		ondelete={() => {
			deleteOpen = false;
			ondeleteConversation?.(conv.id.toString());
		}}
	/>
{/if}
