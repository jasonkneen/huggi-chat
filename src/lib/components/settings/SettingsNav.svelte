<script lang="ts">
	import CarbonSettings from "~icons/carbon/settings";
	import CarbonColorPalette from "~icons/carbon/color-palette";
	import CarbonCloudServiceManagement from "~icons/carbon/cloud-service-management";
	import CarbonMachineLearningModel from "~icons/carbon/machine-learning-model";
	import CarbonPlugFilled from "~icons/carbon/plug-filled";

	interface Props {
		activeTab: string;
		onTabChange: (tab: string) => void;
	}

	let { activeTab, onTabChange }: Props = $props();

	const tabs = [
		{ id: "general", label: "General", icon: CarbonSettings },
		{ id: "display", label: "Display", icon: CarbonColorPalette },
		{ id: "providers", label: "Providers", icon: CarbonCloudServiceManagement },
		{ id: "models", label: "Models", icon: CarbonMachineLearningModel },
		{ id: "mcp", label: "MCP", icon: CarbonPlugFilled },
	];
</script>

<nav class="flex flex-col gap-1">
	{#each tabs as tab}
		{@const Icon = tab.icon}
		<button
			type="button"
			onclick={() => onTabChange(tab.id)}
			class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors {activeTab === tab.id
				? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
				: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'}"
			aria-current={activeTab === tab.id ? "page" : undefined}
		>
			<Icon class="size-5 flex-shrink-0" />
			<span>{tab.label}</span>
		</button>
	{/each}
</nav>
