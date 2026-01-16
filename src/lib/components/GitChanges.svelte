<script lang="ts">
	import { browser } from "$app/environment";
	import type { Workspace } from "$lib/stores/workspaces";
	import { projectFolder, type GitFileStatus } from "$lib/stores/projectFolder";
	import IconGit from "~icons/carbon/logo-git";

	interface Props {
		workspace: Workspace;
	}

	let { workspace }: Props = $props();

	// Tab state
	let activeTab: "diff" | "log" | "issues" = $state("diff");

	let gitFiles = $state<GitFileStatus[]>([]);
	let loading = $state(false);
	let branchName = $state("main");
	let totalAdditions = $state(0);
	let totalDeletions = $state(0);

	// Load git status when workspace changes
	$effect(() => {
		if (workspace?.path && workspace.isGitRepo) {
			loadGitStatus();
		}
	});

	async function loadGitStatus() {
		if (!browser || !(window as any).electronAPI) return;

		loading = true;

		try {
			const result = await (window as any).electronAPI.gitStatus({
				projectPath: workspace.path,
			});

			if (result.success) {
				gitFiles = result.files || [];
				branchName = result.branch || "main";

				// Calculate totals (mock - would need real diff stats)
				totalAdditions = gitFiles.reduce((sum, f) => sum + (f.additions || 0), 0);
				totalDeletions = gitFiles.reduce((sum, f) => sum + (f.deletions || 0), 0);
			}
		} catch (e) {
			console.error("Failed to load git status:", e);
		} finally {
			loading = false;
		}
	}

	function getStatusBadge(file: GitFileStatus): { letter: string; color: string } {
		if (file.untracked) return { letter: "U", color: "bg-green-600" };
		if (file.staged && file.unstaged) return { letter: "M", color: "bg-yellow-600" };
		if (file.staged) return { letter: "A", color: "bg-green-600" };
		if (file.unstaged) return { letter: "M", color: "bg-yellow-600" };
		return { letter: "?", color: "bg-gray-600" };
	}

	function getFileName(path: string): string {
		return path.split("/").pop() || path;
	}

	function getFileDir(path: string): string {
		const parts = path.split("/");
		parts.pop();
		return parts.join("/");
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="px-3 py-2.5">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<IconGit class="size-4 text-gray-400" />
				<span class="text-sm font-medium text-gray-300">GIT</span>
			</div>

			<!-- Tabs -->
			<div class="flex gap-1 rounded-lg bg-gray-800 p-0.5">
				<button
					onclick={() => (activeTab = "diff")}
					class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors
						{activeTab === 'diff'
						? 'bg-gray-700 text-white'
						: 'text-gray-400 hover:text-gray-200'}"
				>
					DIFF
				</button>
				<button
					onclick={() => (activeTab = "log")}
					class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors
						{activeTab === 'log'
						? 'bg-gray-700 text-white'
						: 'text-gray-400 hover:text-gray-200'}"
				>
					LOG
				</button>
				<button
					onclick={() => (activeTab = "issues")}
					class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors
						{activeTab === 'issues'
						? 'bg-gray-700 text-white'
						: 'text-gray-400 hover:text-gray-200'}"
				>
					ISSUES
				</button>
			</div>
		</div>

		<!-- Stats row -->
		<div class="mt-2 flex items-center gap-2 text-xs">
			<span class="text-green-400">+{totalAdditions}</span>
			<span class="text-gray-500">/</span>
			<span class="text-red-400">-{totalDeletions}</span>
		</div>

		<!-- Branch name -->
		<div class="mt-1 text-sm font-medium text-white">{branchName}</div>
	</div>

	<!-- Content -->
	<div class="scrollbar-custom flex-1 overflow-y-auto px-2">
		{#if !workspace.isGitRepo}
			<div class="flex items-center justify-center py-8 text-sm text-gray-500">
				Not a git repository
			</div>
		{:else if loading}
			<div class="flex items-center justify-center py-8 text-sm text-gray-500">
				Loading...
			</div>
		{:else if activeTab === "diff"}
			{#if gitFiles.length === 0}
				<div class="flex items-center justify-center py-8 text-sm text-gray-500">
					No changes
				</div>
			{:else}
				<div class="flex flex-col gap-1 py-2">
					{#each gitFiles as file (file.path)}
						{@const badge = getStatusBadge(file)}
						<button
							class="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-800/50"
						>
							<!-- Status badge -->
							<span
								class="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded text-xs font-medium text-white {badge.color}"
							>
								{badge.letter}
							</span>

							<!-- File info -->
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm text-gray-200">{getFileName(file.path)}</div>
								{#if getFileDir(file.path)}
									<div class="truncate text-xs text-gray-500">{getFileDir(file.path)}</div>
								{/if}
							</div>

							<!-- Change stats -->
							<div class="flex-shrink-0 text-right text-xs">
								{#if file.additions || file.deletions}
									<span class="text-green-400">+{file.additions || 0}</span>
									<span class="text-gray-500"> / </span>
									<span class="text-red-400">-{file.deletions || 0}</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		{:else if activeTab === "log"}
			<div class="flex items-center justify-center py-8 text-sm text-gray-500">
				Git log coming soon
			</div>
		{:else if activeTab === "issues"}
			<div class="flex items-center justify-center py-8 text-sm text-gray-500">
				Issues coming soon
			</div>
		{/if}
	</div>
</div>
