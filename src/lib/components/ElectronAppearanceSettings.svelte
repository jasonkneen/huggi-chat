<script lang="ts">
	import { onMount } from "svelte";
	import IconLightbulb from "~icons/lucide/lightbulb";

	interface ElectronAPI {
		platform: string;
		getAppearanceSettings: () => Promise<{
			vibrancy?: string;
			opacity?: number;
			blur?: number;
			saturation?: number;
		} | null>;
		setVibrancy: (type: string) => Promise<{ success: boolean }>;
		setOpacity: (opacity: number) => Promise<{ success: boolean; opacity: number }>;
		setBlur: (opts: { blur: number; saturation: number }) => Promise<void>;
	}

	declare const window: Window & { electronAPI?: ElectronAPI };

	let isElectron = false;
	let isMac = false;
	let settings = {
		vibrancy: "fullscreen-ui",
		opacity: 1.0,
		blur: 40,
		saturation: 180,
	};

	const vibrancyOptions = [
		{ value: "appearance-based", label: "Appearance Based" },
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
		{ value: "titlebar", label: "Titlebar" },
		{ value: "selection", label: "Selection" },
		{ value: "menu", label: "Menu" },
		{ value: "popover", label: "Popover" },
		{ value: "sidebar", label: "Sidebar" },
		{ value: "medium-light", label: "Medium Light" },
		{ value: "ultra-dark", label: "Ultra Dark" },
		{ value: "header", label: "Header" },
		{ value: "sheet", label: "Sheet" },
		{ value: "window", label: "Window" },
		{ value: "hud", label: "HUD" },
		{ value: "fullscreen-ui", label: "Fullscreen UI" },
		{ value: "tooltip", label: "Tooltip" },
		{ value: "content", label: "Content" },
		{ value: "under-window", label: "Under Window" },
		{ value: "under-page", label: "Under Page" },
	];

	onMount(async () => {
		if (typeof window !== "undefined" && window.electronAPI) {
			isElectron = true;
			isMac = window.electronAPI.platform === "darwin";

			// Load current settings
			const currentSettings = await window.electronAPI.getAppearanceSettings();
			if (currentSettings) {
				settings = { ...settings, ...currentSettings };
			}
		}
	});

	async function updateVibrancy(event: Event) {
		const target = event.target as HTMLSelectElement;
		const type = target.value;
		const result = await window.electronAPI?.setVibrancy(type);
		if (result?.success) {
			settings.vibrancy = type;
		}
	}

	async function updateOpacity(event: Event) {
		const target = event.target as HTMLInputElement;
		const opacity = parseFloat(target.value);
		const result = await window.electronAPI?.setOpacity(opacity);
		if (result?.success) {
			settings.opacity = result.opacity;
		}
	}

	async function updateBlur(event: Event) {
		const target = event.target as HTMLInputElement;
		const blur = parseInt(target.value);
		await window.electronAPI?.setBlur({ blur, saturation: settings.saturation });
		settings.blur = blur;
	}

	async function updateSaturation(event: Event) {
		const target = event.target as HTMLInputElement;
		const saturation = parseInt(target.value);
		await window.electronAPI?.setBlur({ blur: settings.blur, saturation });
		settings.saturation = saturation;
	}
</script>

{#if isElectron}
	<div
		class="space-y-6 rounded-xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50"
	>
		<div>
			<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				Electron Appearance Settings
			</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Customize window transparency and glass effects
			</p>
		</div>

		<!-- Vibrancy (macOS only) -->
		{#if isMac}
			<div class="space-y-2">
				<label for="vibrancy" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Vibrancy Effect
					<span class="ml-2 text-xs text-gray-500">(macOS only)</span>
				</label>
				<select
					id="vibrancy"
					on:change={updateVibrancy}
					bind:value={settings.vibrancy}
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					{#each vibrancyOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Opacity -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<label for="opacity" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Window Opacity
				</label>
				<span class="text-sm text-gray-500 dark:text-gray-400">
					{Math.round(settings.opacity * 100)}%
				</span>
			</div>
			<input
				id="opacity"
				type="range"
				min="0.1"
				max="1.0"
				step="0.05"
				bind:value={settings.opacity}
				on:input={updateOpacity}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
			/>
		</div>

		<!-- Blur Intensity -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<label for="blur" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Blur Intensity
				</label>
				<span class="text-sm text-gray-500 dark:text-gray-400">
					{settings.blur}px
				</span>
			</div>
			<input
				id="blur"
				type="range"
				min="0"
				max="100"
				step="5"
				bind:value={settings.blur}
				on:input={updateBlur}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
			/>
		</div>

		<!-- Saturation -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<label for="saturation" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Color Saturation
				</label>
				<span class="text-sm text-gray-500 dark:text-gray-400">
					{settings.saturation}%
				</span>
			</div>
			<input
				id="saturation"
				type="range"
				min="100"
				max="300"
				step="10"
				bind:value={settings.saturation}
				on:input={updateSaturation}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
			/>
		</div>

		<div
			class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
		>
			<p class="flex items-center gap-1.5 font-medium"><IconLightbulb class="size-4" /> Tip</p>
			<p class="mt-1 text-xs">
				Settings are saved automatically and will persist across app restarts.
			</p>
		</div>
	</div>
{/if}

<style>
	/* Custom range slider styling */
	input[type="range"]::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	input[type="range"]::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	input[type="range"]::-webkit-slider-thumb:hover {
		transform: scale(1.1);
	}

	input[type="range"]::-moz-range-thumb:hover {
		transform: scale(1.1);
	}
</style>
