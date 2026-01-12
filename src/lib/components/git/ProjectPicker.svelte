<script lang="ts">
	import { browser } from "$app/environment";
	import { projectFolder, currentProject } from "$lib/stores/projectFolder";
	import IconFolder from "~icons/carbon/folder";
	import IconFolderAdd from "~icons/carbon/folder-add";
	import IconClose from "~icons/carbon/close";
	import IconGit from "~icons/carbon/logo-github";

	interface Props {
		onSelect?: (folder: { path: string; name: string; isGitRepo: boolean } | null) => void;
		showCurrent?: boolean;
	}

	let { onSelect, showCurrent = true }: Props = $props();

	let isElectron = $state(false);
	if (browser && (window as any).electronAPI) {
		isElectron = true;
	}

	async function handlePickFolder() {
		const folder = await projectFolder.pickFolder();
		if (folder) {
			onSelect?.(folder);
		}
	}

	function handleClear() {
		projectFolder.clear();
		onSelect?.(null);
	}
</script>

{#if isElectron}
	<div class="flex items-center gap-2">
		{#if showCurrent && $currentProject}
			<div
				class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
			>
				{#if $currentProject.isGitRepo}
					<IconGit class="size-4 text-gray-500" />
				{:else}
					<IconFolder class="size-4 text-gray-500" />
				{/if}
				<span class="max-w-[150px] truncate text-gray-700 dark:text-gray-300">
					{$currentProject.name}
				</span>
				<button
					onclick={handleClear}
					class="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					title="Clear project folder"
				>
					<IconClose class="size-3.5" />
				</button>
			</div>
		{:else}
			<button
				onclick={handlePickFolder}
				class="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-800"
				title="Select a project folder"
			>
				<IconFolderAdd class="size-4" />
				<span>Open Folder</span>
			</button>
		{/if}
	</div>
{/if}
