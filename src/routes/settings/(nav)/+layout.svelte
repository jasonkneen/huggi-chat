<script lang="ts">
	import { onMount, tick } from "svelte";
	import { base } from "$app/paths";
	import { afterNavigate, goto } from "$app/navigation";
	import { page } from "$app/state";
	import { useSettingsStore } from "$lib/stores/settings";
	import { browser } from "$app/environment";
	import { isDesktop } from "$lib/utils/isDesktop";

	import SettingsNav from "$lib/components/settings/SettingsNav.svelte";
	import GeneralSettings from "$lib/components/settings/GeneralSettings.svelte";
	import DisplaySettings from "$lib/components/settings/DisplaySettings.svelte";
	import ProvidersSettings from "$lib/components/settings/ProvidersSettings.svelte";
	import ModelsSettings from "$lib/components/settings/ModelsSettings.svelte";
	import McpSettings from "$lib/components/settings/McpSettings.svelte";

	import CarbonClose from "~icons/carbon/close";
	import CarbonChevronLeft from "~icons/carbon/chevron-left";

	import type { LayoutData } from "../$types";

	interface Props {
		data: LayoutData;
		children?: import("svelte").Snippet;
	}

	let { data, children }: Props = $props();

	let previousPage: string = $state(base || "/");
	let activeTab = $state("general");
	let showContent: boolean = $state(true);

	const settings = useSettingsStore();

	function handleTabChange(tab: string) {
		activeTab = tab;
		// On mobile, show content when tab is selected
		if (browser && !isDesktop(window)) {
			showContent = true;
		}
	}

	onMount(() => {
		// Default to general tab
		activeTab = "general";
		showContent = true;
	});

	afterNavigate(({ from }) => {
		if (from?.url && !from.url.pathname.includes("settings")) {
			previousPage = from.url.toString() || previousPage || base || "/";
		}
	});
</script>

<div
	class="mx-auto grid h-full w-full max-w-[1400px] grid-cols-1 grid-rows-[auto,1fr] content-start gap-x-6 overflow-hidden p-4 text-gray-800 dark:text-gray-300 md:grid-cols-[200px,1fr] md:grid-rows-[auto,1fr] md:p-4"
>
	<!-- Header -->
	<div class="col-span-1 mb-3 flex items-center justify-between md:col-span-2 md:mb-4">
		{#if showContent && browser && !isDesktop(window)}
			<button
				class="btn rounded-lg md:hidden"
				aria-label="Back to menu"
				onclick={() => {
					showContent = false;
				}}
			>
				<CarbonChevronLeft
					class="text-xl text-gray-900 hover:text-black dark:text-gray-200 dark:hover:text-white"
				/>
			</button>
		{/if}
		<h2 class="left-0 right-0 mx-auto w-fit text-center text-xl font-bold md:hidden">Settings</h2>
		<h2 class="hidden text-xl font-bold md:block">Settings</h2>
		<button
			class="btn rounded-lg"
			aria-label="Close settings"
			onclick={() => {
				goto(previousPage);
			}}
		>
			<CarbonClose
				class="text-xl text-gray-900 hover:text-black dark:text-gray-200 dark:hover:text-white"
			/>
		</button>
	</div>

	<!-- Sidebar Navigation -->
	{#if !(showContent && browser && !isDesktop(window))}
		<div
			class="col-span-1 flex flex-col overflow-hidden rounded-r-xl bg-gradient-to-l from-gray-50 to-10% pb-4 dark:from-gray-700/40 max-md:-mx-4 max-md:h-full max-md:px-4 md:pr-4"
			class:max-md:hidden={showContent && browser}
		>
			<SettingsNav {activeTab} onTabChange={handleTabChange} />
		</div>
	{/if}

	<!-- Content Area -->
	{#if showContent || (browser && isDesktop(window))}
		<div
			class="scrollbar-custom col-span-1 w-full overflow-y-auto overflow-x-clip px-1"
			class:max-md:hidden={!showContent && browser}
		>
			{#if activeTab === "general"}
				<GeneralSettings />
			{:else if activeTab === "display"}
				<DisplaySettings />
			{:else if activeTab === "providers"}
				<ProvidersSettings />
			{:else if activeTab === "models"}
				<ModelsSettings models={data.models} />
			{:else if activeTab === "mcp"}
				<McpSettings />
			{/if}
		</div>
	{/if}
</div>
