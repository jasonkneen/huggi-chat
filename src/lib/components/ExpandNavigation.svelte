<script lang="ts">
	interface Props {
		isCollapsed: boolean;
		onClick: () => void;
		classNames: string;
		style?: string;
	}

	let { isCollapsed, classNames, onClick, style = '' }: Props = $props();
</script>

<button
	onclick={onClick}
	{style}
	class="{classNames} group flex h-16 w-6 flex-col items-center justify-center -space-y-1 outline-none *:h-3 *:w-1 *:rounded-full max-md:hidden {!isCollapsed
		? '*:bg-gray-400 dark:*:bg-gray-600 *:hover:bg-gray-500 dark:*:hover:bg-gray-500'
		: '*:bg-gray-400 dark:*:bg-gray-600 *:hover:bg-gray-500 dark:*:hover:bg-gray-500'}"
	name="sidebar-toggle"
	aria-label="Toggle sidebar navigation"
>
	<div class={!isCollapsed ? "group-hover:rotate-[20deg]" : "group-hover:-rotate-[20deg]"}></div>
	<div class={!isCollapsed ? "group-hover:-rotate-[20deg]" : "group-hover:rotate-[20deg]"}></div>
</button>
