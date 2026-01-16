<script lang="ts">
	import { browser } from "$app/environment";
	import { activeWorkspace } from "$lib/stores/workspaces";
	import { rightPanelOpen } from "$lib/stores/panels";
	import FileBrowser from "./FileBrowser.svelte";
	import GitChanges from "./GitChanges.svelte";
	import IconFolder from "~icons/carbon/folder";
	import IconGit from "~icons/carbon/logo-git";

	interface Props {
		width?: number;
	}

	let { width = 280 }: Props = $props();

	// View state: "files" or "git"
	let activeView: "files" | "git" = $state("files");

	const isElectron = browser && !!(window as any).electronAPI;
</script>

{#if isElectron && $rightPanelOpen}
	<aside
		class="flex h-full flex-col overflow-hidden border-l border-gray-800 bg-gray-900"
		style="width: {width}px"
	>
		<!-- View toggle (small icons at top) -->
		<div class="flex items-center gap-1 border-b border-gray-800 px-2 py-1.5">
			<button
				onclick={() => (activeView = "files")}
				class="flex size-7 items-center justify-center rounded transition-colors
					{activeView === 'files'
					? 'bg-gray-800 text-white'
					: 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}"
				title="Files"
			>
				<IconFolder class="size-4" />
			</button>
			<button
				onclick={() => (activeView = "git")}
				class="flex size-7 items-center justify-center rounded transition-colors
					{activeView === 'git'
					? 'bg-gray-800 text-white'
					: 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}"
				title="Git"
			>
				<IconGit class="size-4" />
			</button>
		</div>

		<!-- Content area -->
		<div class="flex-1 overflow-hidden">
			{#if !$activeWorkspace}
				<div class="flex h-full items-center justify-center p-4 text-center text-sm text-gray-500">
					Select a workspace to browse files
				</div>
			{:else if activeView === "files"}
				<FileBrowser workspace={$activeWorkspace} />
			{:else}
				<GitChanges workspace={$activeWorkspace} />
			{/if}
		</div>
	</aside>
{/if}
