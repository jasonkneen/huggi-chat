<script lang="ts">
	import { browser } from "$app/environment";
	import type { Workspace } from "$lib/stores/workspaces";
	import IconFolder from "~icons/carbon/folder";
	import IconDocument from "~icons/carbon/document";
	import IconChevronRight from "~icons/carbon/chevron-right";
	import IconChevronDown from "~icons/carbon/chevron-down";
	import IconFilter from "~icons/carbon/filter";

	interface Props {
		workspace: Workspace;
	}

	interface FileEntry {
		name: string;
		path: string;
		isDirectory: boolean;
		children?: FileEntry[];
	}

	let { workspace }: Props = $props();

	let files = $state<FileEntry[]>([]);
	let expandedDirs = $state<Set<string>>(new Set());
	let loading = $state(false);
	let selectedFile = $state<string | null>(null);
	let totalFileCount = $state(0);

	// Load root directory when workspace changes
	$effect(() => {
		if (workspace?.path) {
			loadDirectory(workspace.path, true);
		}
	});

	async function loadDirectory(dirPath: string, isRoot = false) {
		if (!browser || !(window as any).electronAPI) return;

		if (isRoot) {
			loading = true;
			totalFileCount = 0;
		}

		try {
			const result = await (window as any).electronAPI.listDirectory({ path: dirPath });

			if (result.success) {
				const entries: FileEntry[] = result.files
					.sort((a: any, b: any) => {
						// Directories first, then alphabetical
						if (a.isDirectory !== b.isDirectory) {
							return a.isDirectory ? -1 : 1;
						}
						return a.name.localeCompare(b.name);
					})
					.map((f: any) => ({
						name: f.name,
						path: f.path,
						isDirectory: f.isDirectory,
					}));

				if (isRoot) {
					files = entries;
					// Count total files recursively (approximate from initial load)
					totalFileCount = countFiles(entries);
				} else {
					// Update nested directory
					files = updateNestedFiles(files, dirPath, entries);
				}
			}
		} catch (e) {
			console.error("Failed to load directory:", e);
		} finally {
			if (isRoot) {
				loading = false;
			}
		}
	}

	function countFiles(entries: FileEntry[]): number {
		let count = 0;
		for (const entry of entries) {
			if (!entry.isDirectory) {
				count++;
			}
		}
		return count;
	}

	function updateNestedFiles(
		items: FileEntry[],
		targetPath: string,
		children: FileEntry[]
	): FileEntry[] {
		return items.map((item) => {
			if (item.path === targetPath) {
				return { ...item, children };
			}
			if (item.children) {
				return { ...item, children: updateNestedFiles(item.children, targetPath, children) };
			}
			return item;
		});
	}

	async function toggleDirectory(entry: FileEntry) {
		if (!entry.isDirectory) return;

		if (expandedDirs.has(entry.path)) {
			expandedDirs.delete(entry.path);
			expandedDirs = new Set(expandedDirs);
		} else {
			expandedDirs.add(entry.path);
			expandedDirs = new Set(expandedDirs);
			if (!entry.children) {
				await loadDirectory(entry.path);
			}
		}
	}

	function selectFile(entry: FileEntry) {
		if (!entry.isDirectory) {
			selectedFile = entry.path;
		}
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between px-3 py-2.5">
		<div class="flex items-center gap-2">
			<IconFolder class="size-4 text-gray-400" />
			<span class="text-sm font-medium text-gray-300">FILES</span>
			<button class="ml-1 text-gray-500 hover:text-gray-300">
				<IconFilter class="size-3.5" />
			</button>
		</div>
		<span class="text-xs text-gray-500">{totalFileCount} FILES</span>
	</div>

	<!-- File tree -->
	<div class="scrollbar-custom flex-1 overflow-y-auto px-2">
		{#if loading && files.length === 0}
			<div class="flex items-center justify-center py-8 text-sm text-gray-500">
				Loading...
			</div>
		{:else if files.length === 0}
			<div class="flex items-center justify-center py-8 text-sm text-gray-500">
				Empty directory
			</div>
		{:else}
			{#each files as entry (entry.path)}
				{@render fileEntry(entry, 0)}
			{/each}
		{/if}
	</div>
</div>

{#snippet fileEntry(entry: FileEntry, depth: number)}
	<div>
		<button
			onclick={() => (entry.isDirectory ? toggleDirectory(entry) : selectFile(entry))}
			class="flex w-full items-center gap-1.5 rounded py-1 text-left text-sm transition-colors
				{selectedFile === entry.path
				? 'bg-gray-700/50 text-white'
				: 'text-gray-300 hover:bg-gray-800/50'}"
			style="padding-left: {depth * 16 + 8}px"
		>
			{#if entry.isDirectory}
				{#if expandedDirs.has(entry.path)}
					<IconChevronDown class="size-3 flex-shrink-0 text-gray-500" />
				{:else}
					<IconChevronRight class="size-3 flex-shrink-0 text-gray-500" />
				{/if}
				<IconFolder class="size-4 flex-shrink-0 text-gray-400" />
			{:else}
				<span class="size-3 flex-shrink-0"></span>
				<IconDocument class="size-4 flex-shrink-0 text-gray-500" />
			{/if}
			<span class="truncate">{entry.name}</span>
		</button>

		{#if entry.isDirectory && expandedDirs.has(entry.path) && entry.children}
			{#each entry.children as child (child.path)}
				{@render fileEntry(child, depth + 1)}
			{/each}
		{/if}
	</div>
{/snippet}
