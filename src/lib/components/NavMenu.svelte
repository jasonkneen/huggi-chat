<script lang="ts" module>
	export const titles: { [key: string]: string } = {
		today: "Today",
		week: "This week",
		month: "This month",
		older: "Older",
	} as const;
</script>

<script lang="ts">
	import { base } from "$app/paths";

	import Logo from "$lib/components/icons/Logo.svelte";
	import IconSun from "$lib/components/icons/IconSun.svelte";
	import IconMoon from "$lib/components/icons/IconMoon.svelte";
	import { switchTheme, subscribeToTheme } from "$lib/switchTheme";
	import { isAborted } from "$lib/stores/isAborted";
	import { onDestroy } from "svelte";

	import NavConversationItem from "./NavConversationItem.svelte";
	import type { LayoutData } from "../../routes/$types";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import type { Model } from "$lib/types/Model";
	import { page } from "$app/state";
	import InfiniteScroll from "./InfiniteScroll.svelte";
	import { CONV_NUM_PER_PAGE } from "$lib/constants/pagination";
	import { browser } from "$app/environment";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import { requireAuthUser } from "$lib/utils/auth";
	import { enabledServersCount } from "$lib/stores/mcpServers";
	import MCPServerManager from "./mcp/MCPServerManager.svelte";
	import {
		workspaces,
		allWorkspaces,
		activeWorkspace,
		conversationWorkspaces,
	} from "$lib/stores/workspaces";
	import IconFolder from "~icons/carbon/folder";
	import IconFolderOpen from "~icons/carbon/folder-open";
	import IconAdd from "~icons/carbon/add";
	import IconClose from "~icons/carbon/close";
	import IconChevronDown from "~icons/carbon/chevron-down";
	import IconChevronRight from "~icons/carbon/chevron-right";

	const publicConfig = usePublicConfig();
	const client = useAPIClient();

	interface Props {
		conversations: ConvSidebar[];
		user: LayoutData["user"];
		p?: number;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
	}

	let {
		conversations = $bindable(),
		user,
		p = $bindable(0),
		ondeleteConversation,
		oneditConversationTitle,
	}: Props = $props();

	let hasMore = $state(true);

	function handleNewChatClick(e: MouseEvent) {
		isAborted.set(true);

		if (requireAuthUser()) {
			e.preventDefault();
		}
	}

	function handleNavItemClick(e: MouseEvent) {
		if (requireAuthUser()) {
			e.preventDefault();
		}
	}

	const dateRanges = [
		new Date().setDate(new Date().getDate() - 1),
		new Date().setDate(new Date().getDate() - 7),
		new Date().setMonth(new Date().getMonth() - 1),
	];

	let groupedConversations = $derived({
		today: conversations.filter(({ updatedAt }) => updatedAt.getTime() > dateRanges[0]),
		week: conversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[1] && updatedAt.getTime() < dateRanges[0]
		),
		month: conversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[2] && updatedAt.getTime() < dateRanges[1]
		),
		older: conversations.filter(({ updatedAt }) => updatedAt.getTime() < dateRanges[2]),
	});

	const nModels: number = page.data.models.filter((el: Model) => !el.unlisted).length;

	async function handleVisible() {
		p++;
		const newConvs = await client.conversations
			.get({
				query: {
					p,
				},
			})
			.then(handleResponse)
			.then((r) => r.conversations)
			.catch((): ConvSidebar[] => []);

		if (newConvs.length === 0) {
			hasMore = false;
		}

		conversations = [...conversations, ...newConvs];
	}

	$effect(() => {
		if (conversations.length <= CONV_NUM_PER_PAGE) {
			// reset p to 0 if there's only one page of content
			// that would be caused by a data loading invalidation
			p = 0;
		}
	});

	let isDark = $state(false);
	let unsubscribeTheme: (() => void) | undefined;
	let showMcpModal = $state(false);
	let workspaceSectionCollapsed = $state(false);
	let chatsSectionCollapsed = $state(false);

	const isElectron = browser && !!(window as any).electronAPI;

	if (browser) {
		unsubscribeTheme = subscribeToTheme(({ isDark: nextIsDark }) => {
			isDark = nextIsDark;
		});
	}

	onDestroy(() => {
		unsubscribeTheme?.();
	});

	async function handleAddWorkspace() {
		await workspaces.addWorkspace();
	}

	function handleRemoveWorkspace(workspaceId: string) {
		workspaces.removeWorkspace(workspaceId);
	}

	function handleSelectWorkspace(workspaceId: string | null) {
		workspaces.setActiveWorkspace(workspaceId);
	}
</script>

<div
	class="sticky top-0 flex flex-none touch-none items-center justify-between px-1.5 py-3.5 max-sm:pt-0"
>
	<a
		class="flex select-none items-center rounded-xl text-lg font-semibold"
		href="{publicConfig.PUBLIC_ORIGIN}{base}/"
	>
		<Logo classNames="dark:invert mr-[2px]" />
		{publicConfig.PUBLIC_APP_NAME}
	</a>
	<a
		href={`${base}/`}
		onclick={handleNewChatClick}
		class="flex rounded-lg border px-2 py-0.5 text-center shadow-sm hover:shadow-none sm:text-smd
			{$activeWorkspace
			? 'border-blue-500/30 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-900/30 dark:text-blue-400'
			: 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'}"
		title="Ctrl/Cmd + Shift + O"
	>
		New Chat
	</a>
</div>

<div
	class="scrollbar-custom flex min-h-0 flex-col gap-1 overflow-y-auto rounded-r-xl border border-l-0 border-gray-100 px-3 py-2 dark:border-transparent md:bg-gradient-to-l md:from-gray-50 md:dark:from-gray-800/30"
>
	{#if isElectron}
		<div class="flex w-full items-center gap-1.5 px-1 py-1">
			<button
				onclick={() => (workspaceSectionCollapsed = !workspaceSectionCollapsed)}
				class="flex flex-1 items-center gap-1.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
			>
				{#if workspaceSectionCollapsed}
					<IconChevronRight class="size-3 flex-shrink-0" />
				{:else}
					<IconChevronDown class="size-3 flex-shrink-0" />
				{/if}
				<span>Workspaces</span>
				<span class="text-xs text-gray-400">{$allWorkspaces.length}</span>
			</button>
			<button
				onclick={handleAddWorkspace}
				class="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
				title="Add workspace folder"
			>
				<IconAdd class="size-3.5" />
			</button>
		</div>

		{#if !workspaceSectionCollapsed}
			<div class="flex flex-col gap-0.5 pb-2">
				{#if $allWorkspaces.length === 0}
					<div class="px-2 py-1 text-xs text-gray-400 dark:text-gray-500">
						No workspaces yet. Click + to add a folder.
					</div>
				{:else}
					{#each $allWorkspaces as ws (ws.id)}
						{@const wsConvIds = Object.entries($conversationWorkspaces)
							.filter(([, wsIds]) => wsIds.includes(ws.id))
							.map(([convId]) => convId)}
						{@const wsConvs = conversations.filter((c) => wsConvIds.includes(c.id.toString()))}
						<div class="flex flex-col">
							<div
								class="group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700
									{$activeWorkspace?.id === ws.id
									? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
									: 'text-gray-600 dark:text-gray-400'}"
							>
								<button
									onclick={() => workspaces.toggleWorkspaceCollapsed(ws.id)}
									class="flex-shrink-0 p-0.5"
								>
									{#if ws.isCollapsed}
										<IconChevronRight class="size-3" />
									{:else}
										<IconChevronDown class="size-3" />
									{/if}
								</button>
								<button
									onclick={() =>
										handleSelectWorkspace($activeWorkspace?.id === ws.id ? null : ws.id)}
									class="flex flex-1 items-center gap-1.5 text-left"
								>
									{#if $activeWorkspace?.id === ws.id}
										<IconFolderOpen class="size-4 flex-shrink-0" />
									{:else}
										<IconFolder class="size-4 flex-shrink-0" />
									{/if}
									<span class="flex-1 truncate">{ws.name}</span>
									{#if wsConvs.length > 0}
										<span class="text-xs text-gray-400">{wsConvs.length}</span>
									{/if}
								</button>
								<button
									onclick={() => handleRemoveWorkspace(ws.id)}
									class="hidden rounded p-0.5 text-gray-400 group-hover:block hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
									title="Remove workspace"
								>
									<IconClose class="size-3" />
								</button>
							</div>
							{#if !ws.isCollapsed && wsConvs.length > 0}
								<div
									class="ml-5 flex flex-col gap-0.5 border-l border-gray-200 pl-2 dark:border-gray-700"
								>
									{#each wsConvs as conv}
										<NavConversationItem {conv} {oneditConversationTitle} {ondeleteConversation} />
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	{/if}

	<div class="flex w-full items-center gap-1.5 px-1 py-1">
		<button
			onclick={() => (chatsSectionCollapsed = !chatsSectionCollapsed)}
			class="flex flex-1 items-center gap-1.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
		>
			{#if chatsSectionCollapsed}
				<IconChevronRight class="size-3 flex-shrink-0" />
			{:else}
				<IconChevronDown class="size-3 flex-shrink-0" />
			{/if}
			<span>Chats</span>
			<span class="text-xs text-gray-400">{conversations.length}</span>
		</button>
	</div>

	{#if !chatsSectionCollapsed}
		<div class="flex flex-col gap-0.5 text-[.9rem]">
			{#each Object.entries(groupedConversations) as [group, convs]}
				{#if convs.length}
					<h4 class="mb-1.5 mt-3 pl-0.5 text-xs text-gray-400 first:mt-0 dark:text-gray-500">
						{titles[group]}
					</h4>
					{#each convs as conv}
						<NavConversationItem {conv} {oneditConversationTitle} {ondeleteConversation} />
					{/each}
				{/if}
			{/each}
			{#if hasMore}
				<InfiniteScroll onvisible={handleVisible} />
			{/if}
		</div>
	{/if}
</div>

<div
	class="flex touch-none flex-col gap-1 rounded-r-xl border border-l-0 border-gray-100 p-3 text-sm dark:border-transparent md:mt-3 md:bg-gradient-to-l md:from-gray-50 md:dark:from-gray-800/30"
>
	{#if user?.username || user?.email}
		<div
			class="group flex items-center gap-1.5 rounded-lg pl-2.5 pr-2 hover:bg-gray-100 dark:hover:bg-gray-700"
		>
			<span
				class="flex h-9 flex-none shrink items-center gap-1.5 truncate pr-2 text-gray-500 dark:text-gray-400"
				>{user?.username || user?.email}</span
			>

			<img
				src="https://huggingface.co/api/users/{user.username}/avatar?redirect=true"
				class="ml-auto size-4 rounded-full border bg-gray-500 dark:border-white/40"
				alt=""
			/>
		</div>
	{/if}
	<a
		href="{base}/models"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		onclick={handleNavItemClick}
	>
		Models
		<span
			class="ml-auto rounded-md bg-gray-500/5 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-500/20 dark:text-gray-400"
			>{nModels}</span
		>
	</a>

	{#if user?.username || user?.email}
		<button
			onclick={() => (showMcpModal = true)}
			class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		>
			MCP Servers
			{#if $enabledServersCount > 0}
				<span
					class="ml-auto rounded-md bg-blue-600/10 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-600/20 dark:text-blue-400"
				>
					{$enabledServersCount}
				</span>
			{/if}
		</button>
	{/if}

	<span class="flex gap-1">
		<a
			href="{base}/settings/application"
			class="flex h-9 flex-none flex-grow items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
			onclick={handleNavItemClick}
		>
			Settings
		</a>
		<button
			onclick={() => {
				switchTheme();
			}}
			aria-label="Toggle theme"
			class="flex size-9 min-w-[1.5em] flex-none items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		>
			{#if browser}
				{#if isDark}
					<IconSun />
				{:else}
					<IconMoon />
				{/if}
			{/if}
		</button>
	</span>
</div>

{#if showMcpModal}
	<MCPServerManager onclose={() => (showMcpModal = false)} />
{/if}
