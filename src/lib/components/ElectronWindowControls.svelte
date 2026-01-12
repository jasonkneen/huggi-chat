<script lang="ts">
	import { onMount } from "svelte";

	interface ElectronAPI {
		windowMinimize: () => void;
		windowMaximize: () => void;
		windowClose: () => void;
	}

	declare const window: Window & { electronAPI?: ElectronAPI };

	let isElectron = false;
	let isMaximized = false;

	onMount(() => {
		if (typeof window !== "undefined" && window.electronAPI) {
			isElectron = true;
		}
	});

	function minimize() {
		window.electronAPI?.windowMinimize();
	}

	function maximize() {
		window.electronAPI?.windowMaximize();
		isMaximized = !isMaximized;
	}

	function close() {
		window.electronAPI?.windowClose();
	}
</script>

{#if isElectron}
	<div
		class="electron-titlebar drag-region fixed left-0 right-0 top-[5px] z-50 flex h-12 items-center justify-between px-4"
	>
		<!-- Left side - App title or logo -->
		<div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
			<span>ChatUI</span>
		</div>

		<!-- Right side - Window controls -->
		<div class="window-controls flex gap-2">
			<button
				on:click={minimize}
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-gray-600 backdrop-blur-sm transition-all hover:bg-white/20 dark:text-gray-300"
				aria-label="Minimize"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>

			<button
				on:click={maximize}
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-gray-600 backdrop-blur-sm transition-all hover:bg-white/20 dark:text-gray-300"
				aria-label="Maximize"
			>
				{#if isMaximized}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<rect x="3" y="3" width="14" height="14" rx="2" />
						<path d="M7 21h10a2 2 0 0 0 2-2V9" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" />
					</svg>
				{/if}
			</button>

			<button
				on:click={close}
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-600 backdrop-blur-sm transition-all hover:bg-red-500/40 dark:text-red-400"
				aria-label="Close"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	</div>
{/if}

<style>
	.electron-titlebar {
		-webkit-app-region: drag;
	}

	.window-controls button {
		-webkit-app-region: no-drag;
	}

	/* Glass effect for titlebar */
	.electron-titlebar {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(20px) saturate(150%);
		-webkit-backdrop-filter: blur(20px) saturate(150%);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .electron-titlebar {
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
</style>
