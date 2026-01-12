<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import IconClose from "~icons/carbon/close";
	import IconDocument from "~icons/carbon/document";

	interface Props {
		filePath: string;
		diff: string;
		onClose: () => void;
	}

	let { filePath, diff, onClose }: Props = $props();

	let diffHtml = $state("");
	let viewMode = $state<"split" | "unified">("unified");

	function getFileName(path: string) {
		return path.split("/").pop() || path;
	}

	onMount(async () => {
		if (browser && diff) {
			const { html } = await import("diff2html");
			diffHtml = html(diff, {
				drawFileList: false,
				matching: "lines",
				outputFormat: viewMode === "split" ? "side-by-side" : "line-by-line",
				renderNothingWhenEmpty: false,
			});
		}
	});

	$effect(() => {
		if (browser && diff) {
			import("diff2html").then(({ html }) => {
				diffHtml = html(diff, {
					drawFileList: false,
					matching: "lines",
					outputFormat: viewMode === "split" ? "side-by-side" : "line-by-line",
					renderNothingWhenEmpty: false,
				});
			});
		}
	});
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/diff2html/3.4.48/bundles/css/diff2html.min.css"
	/>
</svelte:head>

<div class="flex h-full flex-col bg-white dark:bg-gray-900">
	<div
		class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700"
	>
		<div class="flex items-center gap-2">
			<IconDocument class="size-4 text-gray-500" />
			<span class="font-mono text-sm text-gray-700 dark:text-gray-300">{filePath}</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="flex rounded-lg border border-gray-200 dark:border-gray-700">
				<button
					onclick={() => (viewMode = "unified")}
					class="px-3 py-1 text-xs font-medium {viewMode === 'unified'
						? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
						: 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}"
				>
					Unified
				</button>
				<button
					onclick={() => (viewMode = "split")}
					class="px-3 py-1 text-xs font-medium {viewMode === 'split'
						? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
						: 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}"
				>
					Split
				</button>
			</div>
			<button
				onclick={onClose}
				class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
				title="Close diff viewer"
			>
				<IconClose class="size-5" />
			</button>
		</div>
	</div>

	<div class="diff-container flex-1 overflow-auto">
		{#if diff}
			{@html diffHtml}
		{:else}
			<div class="flex h-full items-center justify-center text-gray-500">No changes to display</div>
		{/if}
	</div>
</div>

<style>
	.diff-container :global(.d2h-wrapper) {
		font-size: 13px;
	}

	.diff-container :global(.d2h-file-header) {
		display: none;
	}

	.diff-container :global(.d2h-code-line-ctn) {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	:global(.dark) .diff-container :global(.d2h-wrapper) {
		background: transparent;
	}

	:global(.dark) .diff-container :global(.d2h-file-diff) {
		background: transparent;
	}

	:global(.dark) .diff-container :global(.d2h-code-linenumber),
	:global(.dark) .diff-container :global(.d2h-code-side-linenumber) {
		background: rgb(31 41 55);
		color: rgb(156 163 175);
		border-color: rgb(55 65 81);
	}

	:global(.dark) .diff-container :global(.d2h-code-line) {
		background: transparent;
		color: rgb(229 231 235);
	}

	:global(.dark) .diff-container :global(.d2h-ins) {
		background: rgba(34, 197, 94, 0.1);
	}

	:global(.dark) .diff-container :global(.d2h-ins .d2h-code-line-ctn) {
		background: rgba(34, 197, 94, 0.15);
	}

	:global(.dark) .diff-container :global(.d2h-del) {
		background: rgba(239, 68, 68, 0.1);
	}

	:global(.dark) .diff-container :global(.d2h-del .d2h-code-line-ctn) {
		background: rgba(239, 68, 68, 0.15);
	}

	:global(.dark) .diff-container :global(.d2h-info) {
		background: rgb(55 65 81);
		color: rgb(156 163 175);
		border-color: rgb(75 85 99);
	}
</style>
