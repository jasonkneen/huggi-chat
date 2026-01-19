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
	import { goto } from "$app/navigation";

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
		pendingNewChatWorkspaceId,
	} from "$lib/stores/workspaces";
	import IconFolder from "~icons/carbon/folder";
	import IconFolderOpen from "~icons/carbon/folder-open";
	import IconAdd from "~icons/carbon/add";
	import IconClose from "~icons/carbon/close";
	import IconChevronDown from "~icons/carbon/chevron-down";
	import IconChevronRight from "~icons/carbon/chevron-right";
	import IconChat from "~icons/carbon/chat";
	import IconCode from "~icons/carbon/code";

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

	// Electron detection - must be defined before derived values that use it
	const isElectron = browser && !!(window as any).electronAPI;

	// Filter out conversations that are assigned to a workspace (Electron only)
	// These will appear in the Code tab under their workspace instead
	let unassignedConversations = $derived(
		isElectron
			? conversations.filter((c) => !$conversationWorkspaces[c.id.toString()])
			: conversations
	);

	let groupedConversations = $derived({
		today: unassignedConversations.filter(({ updatedAt }) => updatedAt.getTime() > dateRanges[0]),
		week: unassignedConversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[1] && updatedAt.getTime() < dateRanges[0]
		),
		month: unassignedConversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[2] && updatedAt.getTime() < dateRanges[1]
		),
		older: unassignedConversations.filter(({ updatedAt }) => updatedAt.getTime() < dateRanges[2]),
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

	// View state for Electron: "projects" or "chats"
	let activeView: "projects" | "chats" = $state("projects");
	let showViewDropdown = $state(false);

	if (browser) {
		unsubscribeTheme = subscribeToTheme(({ isDark: nextIsDark }) => {
			isDark = nextIsDark;
		});
	}

	onDestroy(() => {
		unsubscribeTheme?.();
	});

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (showViewDropdown) {
			const target = event.target as HTMLElement;
			if (!target.closest(".view-dropdown-container")) {
				showViewDropdown = false;
			}
		}
	}

	async function handleAddWorkspace() {
		await workspaces.addWorkspace();
	}

	function handleRemoveWorkspace(workspaceId: string) {
		workspaces.removeWorkspace(workspaceId);
	}

	function handleSelectWorkspace(workspaceId: string | null) {
		workspaces.setActiveWorkspace(workspaceId);
	}

	function handleNewChat(workspaceId?: string) {
		isAborted.set(true);
		if (requireAuthUser()) return;

		// Set pending workspace if provided
		if (workspaceId) {
			workspaces.setPendingNewChatWorkspace(workspaceId);
			workspaces.setActiveWorkspace(workspaceId);
		} else {
			workspaces.setPendingNewChatWorkspace(null);
		}

		goto(`${base}/`, { invalidateAll: true });
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div
	class="sticky top-0 flex flex-none touch-none items-center justify-between px-3 py-3.5 max-sm:pt-0"
>
	<a
		class="flex select-none items-center gap-2 rounded-xl text-lg font-semibold"
		href="{publicConfig.PUBLIC_ORIGIN}{base}/"
	>
		<img src="/chatui/robot-avatar.png" alt="Logo" class="size-10 object-contain" />
		{publicConfig.PUBLIC_APP_NAME}
	</a>
</div>

<div
	class="scrollbar-custom flex min-h-0 flex-col gap-1 overflow-y-auto rounded-r-xl border border-l-0 border-gray-100 px-3 py-2 dark:border-transparent md:bg-gradient-to-l md:from-gray-50 md:dark:from-gray-800/30"
>
	<!-- View selector: Only shown in Electron -->
	{#if isElectron}
		<div class="view-dropdown-container relative mb-2 flex items-center">
			<!-- Dropdown trigger -->
			<button
				onclick={() => (showViewDropdown = !showViewDropdown)}
				class="flex flex-1 items-center gap-2 px-1 py-1.5 text-left"
			>
				<IconFolder class="size-4 text-gray-500 dark:text-gray-400" />
				<span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
					{activeView === "projects" ? "Workspaces" : "Chats"}
				</span>
				<IconChevronDown
					class="size-4 text-gray-400 transition-transform {showViewDropdown ? 'rotate-180' : ''}"
				/>
			</button>

			<!-- Add workspace button (only in projects view) -->
			{#if activeView === "projects"}
				<button
					onclick={(e) => {
						e.stopPropagation();
						handleAddWorkspace();
					}}
					class="flex size-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
					title="Add workspace"
				>
					<IconAdd class="size-4" />
				</button>
			{/if}

			<!-- Dropdown menu -->
			{#if showViewDropdown}
				<div
					class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
				>
					<button
						onclick={() => {
							activeView = "chats";
							showViewDropdown = false;
						}}
						class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700
							{activeView === 'chats' ? 'bg-gray-50 dark:bg-gray-700/50' : ''}"
					>
						<IconChat class="size-4 text-gray-500 dark:text-gray-400" />
						<span class="text-gray-700 dark:text-gray-200">Chats</span>
					</button>
					<button
						onclick={() => {
							activeView = "projects";
							showViewDropdown = false;
						}}
						class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700
							{activeView === 'projects' ? 'bg-gray-50 dark:bg-gray-700/50' : ''}"
					>
						<IconFolder class="size-4 text-gray-500 dark:text-gray-400" />
						<span class="text-gray-700 dark:text-gray-200">Workspaces</span>
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- WORKSPACES VIEW: (Electron only) -->
	{#if isElectron && activeView === "projects"}
		<div class="flex flex-col gap-0.5">
			{#if $allWorkspaces.length === 0}
				<div class="px-2 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
					No workspaces yet
				</div>
			{:else}
				{#each $allWorkspaces as ws (ws.id)}
					{@const wsConvIds = Object.entries($conversationWorkspaces)
						.filter(([, wsId]) => wsId === ws.id)
						.map(([convId]) => convId)}
					{@const wsConvs = conversations.filter((c) => wsConvIds.includes(c.id.toString()))}
					<div class="flex flex-col">
						<!-- Workspace name header -->
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
									<span class="text-xs text-gray-400">({wsConvs.length})</span>
								{/if}
							</button>
							<button
								onclick={() => handleNewChat(ws.id)}
								class="hidden rounded p-0.5 text-gray-400 group-hover:block hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
								title="New chat in workspace"
							>
								<IconAdd class="size-3" />
							</button>
							<button
								onclick={() => handleRemoveWorkspace(ws.id)}
								class="hidden rounded p-0.5 text-gray-400 group-hover:block hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
								title="Remove workspace"
							>
								<IconClose class="size-3" />
							</button>
						</div>
						{#if !ws.isCollapsed && (wsConvs.length > 0 || $pendingNewChatWorkspaceId === ws.id)}
							<div
								class="ml-5 flex flex-col gap-0.5 border-l border-l-[0.5px] border-gray-200 pl-2 dark:border-gray-500"
								>
									<!-- Pending new chat placeholder -->
									{#if $pendingNewChatWorkspaceId === ws.id}
										<a
											href="{base}/"
											class="flex min-h-[2.5rem] items-start gap-2.5 rounded-lg bg-blue-50 px-2 py-2 dark:bg-blue-900/30"
										>
											<div class="mt-1.5 size-2 flex-shrink-0 animate-pulse rounded-full bg-blue-400"></div>
											<span class="text-sm text-blue-700 dark:text-blue-400">New agent</span>
										</a>
									{/if}
									{#each wsConvs as conv}
										<NavConversationItem {conv} workspaceId={ws.id} {oneditConversationTitle} {ondeleteConversation} />
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
		</div>
	{/if}

	<!-- CHATS VIEW: Conversations (always shown on web, shown in Chats view on Electron) -->
	{#if !isElectron || activeView === "chats"}
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
			<button
				onclick={() => handleNewChat()}
				class="flex size-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
				title="New chat"
			>
				<IconAdd class="size-3.5" />
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
	{/if}
</div>

<!-- Bottom icon bar -->
<div
	class="flex touch-none items-center justify-center gap-2 border-t border-gray-100 px-3 py-3 dark:border-gray-800"
>
	<!-- Settings -->
	<a
		href="{base}/settings/application"
		class="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
		onclick={handleNavItemClick}
		title="Settings"
	>
		<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
			/>
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
		</svg>
	</a>

	<!-- Models -->
	<a
		href="{base}/models"
		class="relative flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
		onclick={handleNavItemClick}
		title="Models ({nModels})"
	>
		<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.3m14.8 0 .21 1.847a2.243 2.243 0 0 1-1.274 2.23l-3.622 1.81a2.25 2.25 0 0 1-2.01.013l-3.9-1.624a2.243 2.243 0 0 1-1.346-2.105l.038-1.366M5 15.3l-.05 1.778a2.243 2.243 0 0 0 1.273 2.132l3.676 1.768a2.25 2.25 0 0 0 2.01.012l3.794-1.738a2.243 2.243 0 0 0 1.278-2.132l-.036-1.02"
			/>
		</svg>
		{#if nModels > 0}
			<span
				class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-gray-500 text-[10px] font-medium text-white dark:bg-gray-600"
			>
				{nModels}
			</span>
		{/if}
	</a>

	<!-- MCP Servers -->
	{#if user?.username || user?.email}
		<button
			onclick={() => (showMcpModal = true)}
			class="relative flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
			title="MCP Servers"
		>
			<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
				/>
			</svg>
			{#if $enabledServersCount > 0}
				<span
					class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-medium text-white"
				>
					{$enabledServersCount}
				</span>
			{/if}
		</button>
	{/if}

	<!-- Theme toggle -->
	<button
		onclick={() => {
			switchTheme();
		}}
		aria-label="Toggle theme"
		class="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
		title={isDark ? "Switch to light mode" : "Switch to dark mode"}
	>
		{#if browser}
			{#if isDark}
				<IconSun class="size-5" />
			{:else}
				<IconMoon class="size-5" />
			{/if}
		{/if}
	</button>

	<!-- User avatar (if logged in) -->
	{#if user?.username || user?.email}
		<div
			class="flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700"
			title={user?.username || user?.email}
		>
			<img
				src="https://huggingface.co/api/users/{user.username}/avatar?redirect=true"
				class="size-7 rounded-full"
				alt={user?.username || user?.email}
			/>
		</div>
	{/if}
</div>

{#if showMcpModal}
	<MCPServerManager onclose={() => (showMcpModal = false)} />
{/if}
