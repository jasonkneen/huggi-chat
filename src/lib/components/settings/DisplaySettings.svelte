<script lang="ts">
	import { browser } from "$app/environment";
	import { getThemePreference, setTheme, type ThemePreference } from "$lib/switchTheme";
	import ElectronAppearanceSettings from "$lib/components/ElectronAppearanceSettings.svelte";

	let themePref = $state<ThemePreference>(browser ? getThemePreference() : "system");
</script>

<div class="flex w-full flex-col gap-4">
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Display</h2>

	<div
		class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="divide-y divide-gray-200 dark:divide-gray-700">
			<!-- Theme selector -->
			<div class="flex items-start justify-between py-3">
				<div>
					<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Theme</div>
					<p class="text-[12px] text-gray-500 dark:text-gray-400">
						Choose light, dark, or follow system.
					</p>
				</div>
				<div
					class="flex overflow-hidden rounded-md border text-center dark:divide-gray-600 dark:border-gray-600 max-sm:flex-col max-sm:divide-y sm:items-center sm:divide-x"
				>
					<button
						class={"inline-flex items-center justify-center px-2.5 py-1 text-center text-xs " +
							(themePref === "system"
								? "bg-black text-white dark:border-white/10 dark:bg-white/80 dark:text-gray-900"
								: "hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60")}
						onclick={() => {
							setTheme("system");
							themePref = "system";
						}}
					>
						system
					</button>
					<button
						class={"inline-flex items-center justify-center px-2.5 py-1 text-center text-xs " +
							(themePref === "light"
								? "bg-black text-white dark:border-white/10 dark:bg-white/80 dark:text-gray-900"
								: "hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60")}
						onclick={() => {
							setTheme("light");
							themePref = "light";
						}}
					>
						light
					</button>
					<button
						class={"inline-flex items-center justify-center px-2.5 py-1 text-center text-xs " +
							(themePref === "dark"
								? "bg-black text-white dark:border-white/10 dark:bg-white/80 dark:text-gray-900"
								: "hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60")}
						onclick={() => {
							setTheme("dark");
							themePref = "dark";
						}}
					>
						dark
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Electron Appearance Settings -->
	<ElectronAppearanceSettings />
</div>
