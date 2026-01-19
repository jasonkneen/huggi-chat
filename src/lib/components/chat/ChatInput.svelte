<script lang="ts">
	import { onMount, tick } from "svelte";

	import { afterNavigate } from "$app/navigation";

	import { DropdownMenu } from "bits-ui";
	import IconPlus from "~icons/lucide/plus";
	import CarbonImage from "~icons/carbon/image";
	import CarbonDocument from "~icons/carbon/document";
	import CarbonUpload from "~icons/carbon/upload";
	import CarbonLink from "~icons/carbon/link";
	import CarbonChevronRight from "~icons/carbon/chevron-right";
	import CarbonClose from "~icons/carbon/close";
	import CarbonFolder from "~icons/carbon/folder";
	import UrlFetchModal from "./UrlFetchModal.svelte";
	import { TEXT_MIME_ALLOWLIST, IMAGE_MIME_ALLOWLIST_DEFAULT } from "$lib/constants/mime";
	import MCPServerManager from "$lib/components/mcp/MCPServerManager.svelte";
	import IconMCP from "$lib/components/icons/IconMCP.svelte";
	import { workspaces, allWorkspaces, conversationWorkspaces } from "$lib/stores/workspaces";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import { browser } from "$app/environment";
	import ThinkingLevelChip from "./ThinkingLevelChip.svelte";
	import { thinkingLevel } from "$lib/stores/thinkingLevel";

	import { isVirtualKeyboard } from "$lib/utils/isVirtualKeyboard";
	import { requireAuthUser } from "$lib/utils/auth";
	import {
		enabledServersCount,
		selectedServerIds,
		allMcpServers,
		toggleServer,
		disableAllServers,
	} from "$lib/stores/mcpServers";
	import { getMcpServerFaviconUrl } from "$lib/utils/favicon";
	import { page } from "$app/state";
	import SlashCommandMenu from "./SlashCommandMenu.svelte";
	import AtMentionMenu from "./AtMentionMenu.svelte";
	import { allSlashCommands, initSlashCommands } from "$lib/stores/slashCommands";
	import { filterCommands, type SlashCommand } from "$lib/utils/slashCommands";
	import { allMentionItems, initAtMentions } from "$lib/stores/atMentions";
	import { parseAtMention, filterMentions, type AtMentionItem } from "$lib/utils/atMentions";

	interface Props {
		files?: File[];
		mimeTypes?: string[];
		value?: string;
		placeholder?: string;
		loading?: boolean;
		disabled?: boolean;
		modelIsMultimodal?: boolean;
		modelSupportsTools?: boolean;
		children?: import("svelte").Snippet;
		onPaste?: (e: ClipboardEvent) => void;
		focused?: boolean;
		onsubmit?: () => void;
		oncommand?: (command: SlashCommand, args: string) => void;
	}

	let {
		files = $bindable([]),
		mimeTypes = [],
		value = $bindable(""),
		placeholder = "",
		loading = false,
		disabled = false,

		modelIsMultimodal = false,
		modelSupportsTools = true,
		children,
		onPaste,
		focused = $bindable(false),
		onsubmit,
		oncommand,
	}: Props = $props();

	let showSlashMenu = $state(false);
	let slashMenuIndex = $state(0);
	let showAtMenu = $state(false);
	let atMenuIndex = $state(0);
	let atMentionStart = $state(-1);

	const filteredSlashCommands = $derived.by(() => {
		if (!showSlashMenu) return [];
		const hasWorkspace = currentConvWorkspaceIds.length > 0;
		return filterCommands(value, $allSlashCommands, { isElectron, hasWorkspace });
	});

	const filteredAtMentions = $derived.by(() => {
		if (!showAtMenu || atMentionStart === -1) return [];
		const query = value.slice(atMentionStart + 1);
		return filterMentions($allMentionItems, query);
	});

	$effect(() => {
		const startsWithSlash = value.startsWith("/");
		const hasNoSpace = !value.includes(" ") || value.split(" ").length === 1;
		showSlashMenu = startsWithSlash && hasNoSpace && value.length < 20;
		if (showSlashMenu) {
			slashMenuIndex = 0;
		}
	});

	$effect(() => {
		const parsed = parseAtMention(value);
		if (parsed && $allMentionItems.length > 0) {
			showAtMenu = true;
			atMentionStart = parsed.startIndex;
			atMenuIndex = 0;
		} else {
			showAtMenu = false;
			atMentionStart = -1;
		}
	});

	function handleSlashCommandSelect(command: SlashCommand) {
		value = `/${command.name} `;
		showSlashMenu = false;
	}

	function handleAtMentionSelect(item: AtMentionItem) {
		if (atMentionStart === -1) return;
		const before = value.slice(0, atMentionStart);
		const after = value.slice(value.length);
		value = `${before}@${item.name} ${after}`;
		showAtMenu = false;
		atMentionStart = -1;
	}

	onMount(() => {
		initSlashCommands();
		initAtMentions();
	});

	const onFileChange = async (e: Event) => {
		if (!e.target) return;
		const target = e.target as HTMLInputElement;
		const selected = Array.from(target.files ?? []);
		if (selected.length === 0) return;
		files = [...files, ...selected];
		await tick();
		void focusTextarea();
	};

	let textareaElement: HTMLTextAreaElement | undefined = $state();
	let isCompositionOn = $state(false);
	let blurTimeout: ReturnType<typeof setTimeout> | null = $state(null);

	let fileInputEl: HTMLInputElement | undefined = $state();
	let isUrlModalOpen = $state(false);
	let isMcpManagerOpen = $state(false);
	let isDropdownOpen = $state(false);

	let isElectron = $state(false);
	let isWorkspaceDropdownOpen = $state(false);

	if (browser && (window as any).electronAPI) {
		isElectron = true;
	}

	const currentConvWorkspaceIds = $derived.by(() => {
		const convId = getConversationId();
		if (!convId) return [];
		return $conversationWorkspaces[convId] ?? [];
	});

	const currentConvWorkspacesList = $derived.by(() => {
		return $allWorkspaces.filter((w) => currentConvWorkspaceIds.includes(w.id));
	});

	function getConversationId(): string | null {
		const match = page.url.pathname.match(/\/conversation\/([^/]+)/);
		return match ? match[1] : null;
	}

	function handleToggleWorkspace(workspaceId: string) {
		const convId = getConversationId();
		if (!convId) return;

		if (currentConvWorkspaceIds.includes(workspaceId)) {
			workspaces.removeConversationFromWorkspace(convId, workspaceId);
		} else {
			workspaces.addConversationToWorkspace(convId, workspaceId);
		}
	}

	async function handleAddToNewWorkspace() {
		const ws = await workspaces.addWorkspace();
		if (ws) {
			const convId = getConversationId();
			if (convId) {
				workspaces.addConversationToWorkspace(convId, ws.id);
			}
		}
	}

	function openPickerWithAccept(accept: string) {
		if (!fileInputEl) return;
		const allAccept = mimeTypes.join(",");
		fileInputEl.setAttribute("accept", accept);
		fileInputEl.click();
		queueMicrotask(() => fileInputEl?.setAttribute("accept", allAccept));
	}

	function openFilePickerText() {
		const textAccept =
			mimeTypes.filter((m) => !(m === "image/*" || m.startsWith("image/"))).join(",") ||
			TEXT_MIME_ALLOWLIST.join(",");
		openPickerWithAccept(textAccept);
	}

	function openFilePickerImage() {
		const imageAccept =
			mimeTypes.filter((m) => m === "image/*" || m.startsWith("image/")).join(",") ||
			IMAGE_MIME_ALLOWLIST_DEFAULT.join(",");
		openPickerWithAccept(imageAccept);
	}

	const waitForAnimationFrame = () =>
		typeof requestAnimationFrame === "function"
			? new Promise<void>((resolve) => {
					requestAnimationFrame(() => resolve());
				})
			: Promise.resolve();

	async function focusTextarea() {
		if (page.data.shared && page.data.loginEnabled && !page.data.user) return;
		if (!textareaElement || textareaElement.disabled || isVirtualKeyboard()) return;
		if (typeof document !== "undefined" && document.activeElement === textareaElement) return;

		await tick();

		if (typeof requestAnimationFrame === "function") {
			await waitForAnimationFrame();
			await waitForAnimationFrame();
		}

		if (!textareaElement || textareaElement.disabled || isVirtualKeyboard()) return;

		try {
			textareaElement.focus({ preventScroll: true });
		} catch {
			textareaElement.focus();
		}
	}

	function handleFetchedFiles(newFiles: File[]) {
		if (!newFiles?.length) return;
		files = [...files, ...newFiles];
		queueMicrotask(async () => {
			await tick();
			void focusTextarea();
		});
	}

	onMount(() => {
		void focusTextarea();
	});

	afterNavigate(() => {
		void focusTextarea();
	});

	function adjustTextareaHeight() {
		if (!textareaElement) {
			return;
		}

		textareaElement.style.height = "auto";
		textareaElement.style.height = `${textareaElement.scrollHeight}px`;

		if (textareaElement.selectionStart === textareaElement.value.length) {
			textareaElement.scrollTop = textareaElement.scrollHeight;
		}
	}

	$effect(() => {
		if (!textareaElement) return;
		void value;
		adjustTextareaHeight();
	});

	function handleKeydown(event: KeyboardEvent) {
		if (showSlashMenu && filteredSlashCommands.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				slashMenuIndex = (slashMenuIndex + 1) % filteredSlashCommands.length;
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				slashMenuIndex =
					(slashMenuIndex - 1 + filteredSlashCommands.length) % filteredSlashCommands.length;
				return;
			}
			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				handleSlashCommandSelect(filteredSlashCommands[slashMenuIndex]);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				showSlashMenu = false;
				return;
			}
		}

		if (showAtMenu && filteredAtMentions.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				atMenuIndex = (atMenuIndex + 1) % filteredAtMentions.length;
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				atMenuIndex = (atMenuIndex - 1 + filteredAtMentions.length) % filteredAtMentions.length;
				return;
			}
			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				handleAtMentionSelect(filteredAtMentions[atMenuIndex]);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				showAtMenu = false;
				return;
			}
		}

		if (
			event.key === "Enter" &&
			!event.shiftKey &&
			!isCompositionOn &&
			!isVirtualKeyboard() &&
			value.trim() !== ""
		) {
			event.preventDefault();
			tick();
			onsubmit?.();
			// Refocus textarea after submit
			queueMicrotask(() => void focusTextarea());
		}
	}

	function handleFocus() {
		if (requireAuthUser()) {
			return;
		}
		if (blurTimeout) {
			clearTimeout(blurTimeout);
			blurTimeout = null;
		}
		focused = true;
	}

	function handleBlur() {
		if (!isVirtualKeyboard()) {
			focused = false;
			return;
		}

		if (blurTimeout) {
			clearTimeout(blurTimeout);
		}

		blurTimeout = setTimeout(() => {
			blurTimeout = null;
			focused = false;
		});
	}

	// Show file upload when any mime is allowed (text always; images if multimodal)
	let showFileUpload = $derived(mimeTypes.length > 0);
	let showNoTools = $derived(!showFileUpload);
	let selectedServers = $derived(
		$allMcpServers.filter((server) => $selectedServerIds.has(server.id))
	);
</script>

<div class="relative flex min-h-full flex-1 flex-col" onpaste={onPaste}>
	{#if showSlashMenu && filteredSlashCommands.length > 0}
		<SlashCommandMenu
			commands={filteredSlashCommands}
			selectedIndex={slashMenuIndex}
			onselect={handleSlashCommandSelect}
			onclose={() => (showSlashMenu = false)}
		/>
	{/if}

	{#if showAtMenu && filteredAtMentions.length > 0}
		<AtMentionMenu
			items={filteredAtMentions}
			selectedIndex={atMenuIndex}
			onselect={handleAtMentionSelect}
			onclose={() => (showAtMenu = false)}
		/>
	{/if}

	<textarea
		rows="1"
		tabindex="0"
		inputmode="text"
		class="scrollbar-custom max-h-[4lh] w-full resize-none overflow-y-auto overflow-x-hidden border-0 bg-transparent px-2.5 py-2.5 outline-none focus:ring-0 focus-visible:ring-0 sm:px-3 md:max-h-[8lh]"
		class:text-gray-400={disabled}
		bind:value
		bind:this={textareaElement}
		onkeydown={handleKeydown}
		oncompositionstart={() => (isCompositionOn = true)}
		oncompositionend={() => (isCompositionOn = false)}
		{placeholder}
		{disabled}
		onfocus={handleFocus}
		onblur={handleBlur}
		onbeforeinput={requireAuthUser}
	></textarea>

	{#if !showNoTools}
		<div
			class={[
				"scrollbar-custom -ml-0.5 flex max-w-[calc(100%-40px)] flex-wrap items-center justify-start gap-2.5 px-3 pb-2.5 pt-1.5 text-gray-500 dark:text-gray-400 max-md:flex-nowrap max-md:overflow-x-auto sm:gap-2",
			]}
		>
			{#if showFileUpload}
				<div class="flex items-center">
					<input
						bind:this={fileInputEl}
						disabled={loading}
						class="absolute hidden size-0"
						aria-label="Upload file"
						type="file"
						multiple
						onchange={onFileChange}
						onclick={(e) => {
							if (requireAuthUser()) {
								e.preventDefault();
							}
						}}
						accept={mimeTypes.join(",")}
					/>

					<DropdownMenu.Root
						bind:open={isDropdownOpen}
						onOpenChange={(open) => {
							if (open && requireAuthUser()) {
								isDropdownOpen = false;
								return;
							}
							isDropdownOpen = open;
						}}
					>
						<DropdownMenu.Trigger
							class="btn size-8 rounded-full border bg-white text-black shadow transition-none enabled:hover:bg-white enabled:hover:shadow-inner dark:border-transparent dark:bg-gray-600/50 dark:text-white dark:hover:enabled:bg-gray-600 sm:size-7"
							disabled={loading}
							aria-label="Add attachment"
						>
							<IconPlus class="text-base sm:text-sm" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal>
							<DropdownMenu.Content
								class="z-50 rounded-xl border border-gray-200 bg-white/95 p-1 text-gray-800 shadow-lg backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/95 dark:text-gray-100"
								side="top"
								sideOffset={8}
								align="start"
								trapFocus={false}
								onCloseAutoFocus={(e) => e.preventDefault()}
								interactOutsideBehavior="defer-otherwise-close"
							>
								{#if modelIsMultimodal}
									<DropdownMenu.Item
										class="flex h-9 select-none items-center gap-1 rounded-md px-2 text-sm text-gray-700 data-[highlighted]:bg-gray-100 focus-visible:outline-none dark:text-gray-200 dark:data-[highlighted]:bg-white/10 sm:h-8"
										onSelect={() => openFilePickerImage()}
									>
										<CarbonImage class="size-4 opacity-90 dark:opacity-80" />
										Add image(s)
									</DropdownMenu.Item>
								{/if}

								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger
										class="flex h-9 select-none items-center gap-1 rounded-md px-2 text-sm text-gray-700 data-[highlighted]:bg-gray-100 data-[state=open]:bg-gray-100 focus-visible:outline-none dark:text-gray-200 dark:data-[highlighted]:bg-white/10 dark:data-[state=open]:bg-white/10 sm:h-8"
									>
										<div class="flex items-center gap-1">
											<CarbonDocument class="size-4 opacity-90 dark:opacity-80" />
											Add text file
										</div>
										<div class="ml-auto flex items-center">
											<CarbonChevronRight class="size-4 opacity-70 dark:opacity-80" />
										</div>
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent
										class="z-50 rounded-xl border border-gray-200 bg-white/95 p-1 text-gray-800 shadow-lg backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/95 dark:text-gray-100"
										sideOffset={10}
										trapFocus={false}
										onCloseAutoFocus={(e) => e.preventDefault()}
										interactOutsideBehavior="defer-otherwise-close"
									>
										<DropdownMenu.Item
											class="flex h-9 select-none items-center gap-1 rounded-md px-2 text-sm text-gray-700 data-[highlighted]:bg-gray-100 focus-visible:outline-none dark:text-gray-200 dark:data-[highlighted]:bg-white/10 sm:h-8"
											onSelect={() => openFilePickerText()}
										>
											<CarbonUpload class="size-4 opacity-90 dark:opacity-80" />
											Upload from device
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex h-9 select-none items-center gap-1 rounded-md px-2 text-sm text-gray-700 data-[highlighted]:bg-gray-100 focus-visible:outline-none dark:text-gray-200 dark:data-[highlighted]:bg-white/10 sm:h-8"
											onSelect={() => (isUrlModalOpen = true)}
										>
											<CarbonLink class="size-4 opacity-90 dark:opacity-80" />
											Fetch from URL
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>

								<!-- MCP Servers submenu -->
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger
										class="flex h-9 select-none items-center gap-1 rounded-md px-2 text-sm text-gray-700 data-[highlighted]:bg-gray-100 data-[state=open]:bg-gray-100 focus-visible:outline-none dark:text-gray-200 dark:data-[highlighted]:bg-white/10 dark:data-[state=open]:bg-white/10 sm:h-8"
									>
										<div class="flex items-center gap-1">
											<IconMCP classNames="size-4 opacity-90 dark:opacity-80" />
											MCP Servers
										</div>
										<div class="ml-auto flex items-center">
											<CarbonChevronRight class="size-4 opacity-70 dark:opacity-80" />
										</div>
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent
										class="z-50 rounded-xl border border-gray-200 bg-white/95 p-1 text-gray-800 shadow-lg backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/95 dark:text-gray-100"
										sideOffset={10}
										trapFocus={false}
										onCloseAutoFocus={(e) => e.preventDefault()}
										interactOutsideBehavior="defer-otherwise-close"
									>
										{#each $allMcpServers as server (server.id)}
											<DropdownMenu.CheckboxItem
												checked={$selectedServerIds.has(server.id)}
												onCheckedChange={() => toggleServer(server.id)}
												closeOnSelect={false}
												class="flex h-9 select-none items-center gap-2 rounded-md px-2 text-sm leading-none text-gray-800 data-[highlighted]:bg-gray-100 focus-visible:outline-none dark:text-gray-100 dark:data-[highlighted]:bg-white/10"
											>
												{#snippet children({ checked })}
													{#if server.url}
														<img
															src={getMcpServerFaviconUrl(server.url)}
															alt=""
															class="size-4 flex-shrink-0 rounded"
														/>
													{/if}
													<span class="max-w-52 truncate py-1">{server.name}</span>
													<div class="ml-auto flex items-center">
														<!-- Toggle visual -->
														<span
															class={[
																"relative mt-px flex h-4 w-7 items-center self-center rounded-full transition-colors",
																checked ? "bg-blue-600/80" : "bg-gray-300 dark:bg-gray-700",
															]}
														>
															<span
																class={[
																	"block size-3 translate-x-0.5 rounded-full bg-white shadow transition-transform",
																	checked ? "translate-x-[14px]" : "translate-x-0.5",
																]}
															></span>
														</span>
													</div>
												{/snippet}
											</DropdownMenu.CheckboxItem>
										{/each}

										{#if $allMcpServers.length > 0}
											<DropdownMenu.Separator class="my-1 h-px bg-gray-200 dark:bg-gray-700/60" />
										{/if}
										<DropdownMenu.Item
											class="flex h-9 select-none items-center gap-1 rounded-md px-2 text-sm text-gray-700 data-[highlighted]:bg-gray-100 focus-visible:outline-none dark:text-gray-200 dark:data-[highlighted]:bg-white/10 sm:h-8"
											onSelect={() => (isMcpManagerOpen = true)}
										>
											Manage MCP Servers
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>

					<ThinkingLevelChip bind:level={$thinkingLevel} />

					{#if $enabledServersCount > 0}
						<div
							class="ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-full border border-blue-500/10 bg-blue-600/10 pl-2 pr-1 text-xs font-semibold text-blue-700 dark:bg-blue-600/20 dark:text-blue-400 sm:h-7"
							class:grayscale={!modelSupportsTools}
							class:opacity-60={!modelSupportsTools}
							class:cursor-help={!modelSupportsTools}
							title={modelSupportsTools
								? "MCP servers enabled"
								: "Current model doesn't support tools"}
						>
							<button
								class="inline-flex cursor-pointer select-none items-center gap-1 bg-transparent p-0 leading-none text-current focus:outline-none"
								type="button"
								title="Manage MCP Servers"
								onclick={() => (isMcpManagerOpen = true)}
								class:line-through={!modelSupportsTools}
							>
								{#if selectedServers.length}
									<span class="flex items-center -space-x-1">
										{#each selectedServers.slice(0, 3) as server (server.id)}
											{#if server.url}
												<img
													src={getMcpServerFaviconUrl(server.url)}
													alt=""
													class="size-4 rounded bg-white p-px shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
												/>
											{/if}
										{/each}
										{#if selectedServers.length > 3}
											<span class="ml-1 text-[10px] font-semibold text-blue-800 dark:text-blue-200">
												+{selectedServers.length - 3}
											</span>
										{/if}
									</span>
								{/if}
								MCP ({$enabledServersCount})
							</button>
							<button
								class="grid size-5 place-items-center rounded-full bg-blue-600/15 text-blue-700 transition-colors hover:bg-blue-600/25 dark:bg-blue-600/25 dark:text-blue-300 dark:hover:bg-blue-600/35"
								aria-label="Disable all MCP servers"
								onclick={() => disableAllServers()}
								type="button"
							>
								<CarbonClose class="size-3.5" />
							</button>
						</div>
					{/if}

									</div>
			{/if}
		</div>
	{/if}
	{@render children?.()}

	<UrlFetchModal
		bind:open={isUrlModalOpen}
		acceptMimeTypes={mimeTypes}
		onfiles={handleFetchedFiles}
	/>

	{#if isMcpManagerOpen}
		<MCPServerManager onclose={() => (isMcpManagerOpen = false)} />
	{/if}
</div>

<style lang="postcss">
	:global(pre),
	:global(textarea) {
		font-family: inherit;
		box-sizing: border-box;
		line-height: 1.5;
		font-size: 16px;
	}
</style>
