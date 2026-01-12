<script lang="ts">
	import { onMount } from "svelte";
	import IconLightbulb from "~icons/lucide/lightbulb";

	interface VibrancyOptions {
		theme: string; // 'light', 'dark', or '#rrggbbaa'
		effect: string; // 'acrylic' or 'blur'
		disableOnBlur: boolean;
	}

	interface ElectronAPI {
		platform: string;
		getAppearanceSettings: () => Promise<{
			vibrancy?: VibrancyOptions;
			opacity?: number;
			blur?: number;
			saturation?: number;
		} | null>;
		setVibrancy: (options: VibrancyOptions) => Promise<{ success: boolean }>;
		setBackgroundMaterial: (material: string) => Promise<{ success: boolean }>;
		setOpacity: (opacity: number) => Promise<{ success: boolean; opacity: number }>;
		setBlur: (opts: { blur: number; saturation: number }) => Promise<void>;
	}

	// Helper to access electronAPI with proper typing
	function getElectronAPI(): ElectronAPI | undefined {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (window as any).electronAPI;
	}

	let isElectron = false;
	let isMac = false;
	let isWindows = false;
	let settings = {
		vibrancy: {
			theme: "sidebar", // Default to sidebar for macOS (adapts to light/dark mode)
			effect: "acrylic",
			disableOnBlur: false,
		} as VibrancyOptions,
		opacity: 1.0,
		blur: 40,
		saturation: 180,
	};

	// macOS vibrancy type options
	const macThemeOptions = [
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
		{ value: "sidebar", label: "Sidebar" },
		{ value: "fullscreen-ui", label: "Fullscreen UI" },
		{ value: "header", label: "Header" },
		{ value: "titlebar", label: "Titlebar" },
		{ value: "menu", label: "Menu" },
		{ value: "popover", label: "Popover" },
		{ value: "under-window", label: "Under Window" },
		{ value: "hud", label: "HUD" },
	];

	// Windows electron-acrylic-window options
	const winThemeOptions = [
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
		{ value: "#00000080", label: "Transparent Black" },
		{ value: "#ffffff80", label: "Transparent White" },
	];

	// Reactive theme options based on platform
	$: themeOptions = isMac ? macThemeOptions : winThemeOptions;

	// Effect options (Windows only - macOS uses system vibrancy)
	const effectOptions = [
		{ value: "acrylic", label: "Acrylic" },
		{ value: "blur", label: "Blur" },
	];

	onMount(async () => {
		if (typeof window !== "undefined" && window.electronAPI) {
			isElectron = true;
			isMac = window.electronAPI.platform === "darwin";
			isWindows = window.electronAPI.platform === "win32";

			// Load current settings
			const currentSettings = await window.electronAPI.getAppearanceSettings();
			if (currentSettings) {
				settings = { ...settings, ...currentSettings };
			}
		}
	});

	async function updateVibrancyTheme(event: Event) {
		const target = event.target as HTMLSelectElement;
		const theme = target.value;
		const newVibrancy = { ...settings.vibrancy, theme };
		const result = await window.electronAPI?.setVibrancy(newVibrancy);
		if (result?.success) {
			settings.vibrancy = newVibrancy;
		}
	}

	async function updateVibrancyEffect(event: Event) {
		const target = event.target as HTMLSelectElement;
		const effect = target.value;
		const newVibrancy = { ...settings.vibrancy, effect };
		const result = await window.electronAPI?.setVibrancy(newVibrancy);
		if (result?.success) {
			settings.vibrancy = newVibrancy;
		}
	}

	async function updateDisableOnBlur(event: Event) {
		const target = event.target as HTMLInputElement;
		const disableOnBlur = target.checked;
		const newVibrancy = { ...settings.vibrancy, disableOnBlur };
		const result = await window.electronAPI?.setVibrancy(newVibrancy);
		if (result?.success) {
			settings.vibrancy = newVibrancy;
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
		class="rounded-xl border border-[0.5px] border-gray-200 bg-white px-3 shadow-sm dark:border-gray-600 dark:bg-gray-800"
	>
		<div class="divide-y divide-[0.5px] divide-gray-200 dark:divide-gray-600">
			<div class="py-3">
				<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
					Electron Appearance Settings
				</div>
				<p class="text-[12px] text-gray-500 dark:text-gray-400">
					Customize window transparency and glass effects
				</p>
			</div>

			<div class="flex items-start justify-between py-3">
				<div class="flex flex-col gap-0.5">
					<label
						for="vibrancyTheme"
						class="text-[13px] font-medium text-gray-800 dark:text-gray-200"
					>
						{isMac ? 'Material Style' : 'Window Theme'}
					</label>
					<p class="text-[11px] text-gray-500 dark:text-gray-400">
						{isMac ? 'Apple\'s blur/tint preset for entire window' : 'Color scheme for window'}
					</p>
				</div>
				<select
					id="vibrancyTheme"
					on:change={updateVibrancyTheme}
					bind:value={settings.vibrancy.theme}
					class="min-w-[120px] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
				>
					{#each themeOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- Effect Type (Windows only) -->
			{#if isWindows}
				<div class="flex items-start justify-between py-3">
					<div>
						<label
							for="vibrancyEffect"
							class="text-[13px] font-medium text-gray-800 dark:text-gray-200"
						>
							Effect Type
						</label>
					</div>
					<select
						id="vibrancyEffect"
						on:change={updateVibrancyEffect}
						bind:value={settings.vibrancy.effect}
						class="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
					>
						{#each effectOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Disable on Blur Toggle -->
			<div class="flex items-center justify-between py-3">
				<label for="disableOnBlur" class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
					Disable effect when window loses focus
				</label>
				<input
					id="disableOnBlur"
					type="checkbox"
					bind:checked={settings.vibrancy.disableOnBlur}
					on:change={updateDisableOnBlur}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
				/>
			</div>

			<!-- Opacity -->
			<div class="py-3">
				<div class="flex items-center justify-between">
					<label for="opacity" class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
						Window Opacity
					</label>
					<span class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
						{(settings.opacity * 100).toFixed(0)}%
					</span>
				</div>
				<input
					id="opacity"
					type="range"
					min="0.90"
					max="1.0"
					step="0.001"
					bind:value={settings.opacity}
					on:input={updateOpacity}
					class="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-300 dark:bg-gray-600"
				/>
			</div>

			<!-- Blur Intensity (Windows only) -->
			{#if isWindows}
				<div class="py-3">
					<div class="flex items-center justify-between">
						<label for="blur" class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
							Blur Intensity
						</label>
						<span class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
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
						class="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-300 dark:bg-gray-600"
					/>
				</div>

				<!-- Saturation (Windows only) -->
				<div class="py-3">
					<div class="flex items-center justify-between">
						<label for="saturation" class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
							Color Saturation
						</label>
						<span class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
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
						class="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-300 dark:bg-gray-600"
					/>
				</div>
			{/if}

			<!-- Tip -->
			<div class="py-3">
				<div
					class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
				>
					<p class="flex items-center gap-1.5 font-medium"><IconLightbulb class="size-4" /> Tip</p>
					<p class="mt-1 text-[12px]">
						Settings are saved automatically and will persist across app restarts.
					</p>
				</div>
			</div>
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
