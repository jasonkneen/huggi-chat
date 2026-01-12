<script lang="ts">
	import { browser } from "$app/environment";
	import {
		projectFolder,
		currentProject,
		gitFiles,
		isGitLoading,
		selectedGitFile,
		hasChanges,
	} from "$lib/stores/projectFolder";
	import IconRefresh from "~icons/carbon/renew";
	import IconFolder from "~icons/carbon/folder";
	import IconDocument from "~icons/carbon/document";
	import IconAdd from "~icons/carbon/add";
	import IconSubtract from "~icons/carbon/subtract";
	import IconEdit from "~icons/carbon/edit";
	import IconWarning from "~icons/carbon/warning";
	import IconChevronRight from "~icons/carbon/chevron-right";

	interface Props {
		isCollapsed: boolean;
		onToggle: () => void;
		onFileSelect: (filePath: string, staged: boolean) => void;
	}

	let { isCollapsed, onToggle, onFileSelect }: Props = $props();

	let isRefreshing = $state(false);

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await projectFolder.refreshGitStatus();
		isRefreshing = false;
	}

	function getStatusIcon(status: string) {
		const code = status.trim();
		if (code === "??" || code.includes("A")) return { icon: IconAdd, color: "text-green-500" };
		if (code.includes("D")) return { icon: IconSubtract, color: "text-red-500" };
		if (code.includes("M")) return { icon: IconEdit, color: "text-yellow-500" };
		return { icon: IconWarning, color: "text-gray-500" };
	}

	function getFileName(filePath: string) {
		return filePath.split("/").pop() || filePath;
	}

	function getFileDir(filePath: string) {
		const parts = filePath.split("/");
		if (parts.length > 1) {
			parts.pop();
			return parts.join("/") + "/";
		}
		return "";
	}

	const stagedFiles = $derived($gitFiles.filter((f) => f.staged));
	const unstagedFiles = $derived($gitFiles.filter((f) => f.unstaged || f.untracked));
</script>

{#if $currentProject?.isGitRepo}
	<button
		onclick={onToggle}
		class="group absolute inset-y-0 right-0 z-10 my-auto flex h-16 w-6 flex-col items-center justify-center -space-y-1 outline-none *:h-3 *:w-1 *:rounded-full *:transition-transform *:hover:bg-gray-300 dark:*:hover:bg-gray-600 max-md:hidden {!isCollapsed
			? '*:bg-gray-200/70 dark:*:bg-gray-800'
			: '*:bg-gray-200 dark:*:bg-gray-700'}"
		class:translate-x-0={isCollapsed}
		class:-translate-x-[260px]={!isCollapsed}
		style="transition: transform 300ms"
		aria-label="Toggle git sidebar"
	>
		<div class={isCollapsed ? "group-hover:rotate-[20deg]" : "group-hover:-rotate-[20deg]"}></div>
		<div class={isCollapsed ? "group-hover:-rotate-[20deg]" : "group-hover:rotate-[20deg]"}></div>
	</button>

	<aside
		class="absolute right-0 top-0 z-0 h-full w-[260px] overflow-hidden border-l border-gray-200 bg-gray-50 transition-transform duration-300 dark:border-gray-700 dark:bg-gray-900 max-md:hidden"
		class:translate-x-full={isCollapsed}
		class:translate-x-0={!isCollapsed}
	>
		<div class="flex h-full flex-col">
			<div
				class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700"
			>
				<div class="flex items-center gap-2">
					<IconFolder class="size-4 text-gray-500" />
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
						{$currentProject.name}
					</span>
				</div>
				<button
					onclick={handleRefresh}
					disabled={isRefreshing || $isGitLoading}
					class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					title="Refresh git status"
				>
					<IconRefresh class="size-4 {isRefreshing || $isGitLoading ? 'animate-spin' : ''}" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto">
				{#if $isGitLoading && $gitFiles.length === 0}
					<div class="flex items-center justify-center py-8">
						<IconRefresh class="size-5 animate-spin text-gray-400" />
					</div>
				{:else if !$hasChanges}
					<div class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
						No changes detected
					</div>
				{:else}
					{#if stagedFiles.length > 0}
						<div class="border-b border-gray-200 dark:border-gray-700">
							<div
								class="flex items-center gap-1 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
							>
								<IconChevronRight class="size-3" />
								Staged ({stagedFiles.length})
							</div>
							<ul class="pb-2">
								{#each stagedFiles as file}
									{@const statusInfo = getStatusIcon(file.status)}
									<li>
										<button
											onclick={() => onFileSelect(file.path, true)}
											class="flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 {$selectedGitFile ===
											file.path
												? 'bg-blue-50 dark:bg-blue-900/20'
												: ''}"
										>
											<svelte:component
												this={statusInfo.icon}
												class="size-3.5 flex-shrink-0 {statusInfo.color}"
											/>
											<span class="truncate text-gray-600 dark:text-gray-400">
												{getFileDir(file.path)}
											</span>
											<span class="truncate font-medium text-gray-900 dark:text-gray-100">
												{getFileName(file.path)}
											</span>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if unstagedFiles.length > 0}
						<div>
							<div
								class="flex items-center gap-1 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
							>
								<IconChevronRight class="size-3" />
								Changes ({unstagedFiles.length})
							</div>
							<ul class="pb-2">
								{#each unstagedFiles as file}
									{@const statusInfo = getStatusIcon(file.status)}
									<li>
										<button
											onclick={() => onFileSelect(file.path, false)}
											class="flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 {$selectedGitFile ===
											file.path
												? 'bg-blue-50 dark:bg-blue-900/20'
												: ''}"
										>
											<svelte:component
												this={statusInfo.icon}
												class="size-3.5 flex-shrink-0 {statusInfo.color}"
											/>
											<span class="truncate text-gray-600 dark:text-gray-400">
												{getFileDir(file.path)}
											</span>
											<span class="truncate font-medium text-gray-900 dark:text-gray-100">
												{getFileName(file.path)}
											</span>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</aside>
{/if}
