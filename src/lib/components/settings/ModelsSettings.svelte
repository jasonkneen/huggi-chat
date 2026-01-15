<script lang="ts">
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import type { BackendModel } from "$lib/server/models";
	import IconOmni from "$lib/components/icons/IconOmni.svelte";
	import { useSettingsStore } from "$lib/stores/settings";
	import { providerSettings } from "$lib/stores/providerSettings";
	import { localModels, type LocalModel } from "$lib/stores/localModels";
	import Switch from "$lib/components/Switch.svelte";
	import CopyToClipBoardBtn from "$lib/components/CopyToClipBoardBtn.svelte";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";
	import CarbonCopy from "~icons/carbon/copy";
	import CarbonChat from "~icons/carbon/chat";
	import CarbonCode from "~icons/carbon/code";
	import CarbonChevronLeft from "~icons/carbon/chevron-left";
	import CarbonCloud from "~icons/carbon/cloud";
	import CarbonLaptop from "~icons/carbon/laptop";
	import LucideImage from "~icons/lucide/image";
	import LucideHammer from "~icons/lucide/hammer";
	import CarbonTextLongParagraph from "~icons/carbon/text-long-paragraph";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { PROVIDERS_HUB_ORGS } from "@huggingface/inference";

	interface Props {
		models: BackendModel[];
	}

	let { models }: Props = $props();

	const publicConfig = usePublicConfig();
	const settings = useSettingsStore();

	// Selected model state
	let selectedModelId = $state<string | null>(null);
	let modelFilter = $state("");

	const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ");
	let queryTokens = $derived(normalize(modelFilter).trim().split(/\s+/).filter(Boolean));

	// Get provider category for a model
	function getProviderCategory(model: BackendModel): "cloud" | "ollama" | "lmstudio" | "local" {
		const endpoint = (model as unknown as { endpoints?: Array<{ type?: string }> }).endpoints?.[0];
		if (endpoint?.type === "ollama") return "ollama";
		if (endpoint?.type === "llamacpp" || endpoint?.type === "lmstudio") return "lmstudio";
		if (model.id.startsWith("ollama/")) return "ollama";
		if (model.id.startsWith("lmstudio/")) return "lmstudio";
		// Check if it looks like a local model
		if (model.id.includes("localhost") || model.id.includes("127.0.0.1")) return "local";
		return "cloud";
	}

	// Extended BackendModel type for local models
	interface LocalBackendModel extends BackendModel {
		_isLocal: true;
		_localProvider: "ollama" | "lmstudio";
		_size?: number;
		_modifiedAt?: string;
	}

	// Convert LocalModel to BackendModel-like structure
	function localToBackendModel(m: LocalModel): LocalBackendModel {
		return {
			id: m.id,
			name: m.name,
			displayName: m.displayName,
			description: `Local model running on ${m.provider === "ollama" ? "Ollama" : "LM Studio"}`,
			websiteUrl: m.provider === "ollama" ? "https://ollama.com" : "https://lmstudio.ai",
			modelUrl: m.provider === "ollama" ? "https://ollama.com/library" : "https://lmstudio.ai",
			preprompt: "",
			parameters: {},
			unlisted: false,
			multimodal: false,
			_isLocal: true,
			_localProvider: m.provider,
			_size: m.size,
			_modifiedAt: m.modifiedAt,
		} as LocalBackendModel;
	}

	// Check if model is a local model
	function isLocalModel(model: BackendModel | undefined): model is LocalBackendModel {
		return !!model && "_isLocal" in model && model._isLocal === true;
	}

	// Format bytes to human readable
	function formatBytes(bytes: number | undefined): string {
		if (!bytes) return "";
		const gb = bytes / (1024 * 1024 * 1024);
		if (gb >= 1) return `${gb.toFixed(1)} GB`;
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(0)} MB`;
	}

	// Group models by provider
	interface ModelGroup {
		category: "cloud" | "ollama" | "lmstudio" | "local";
		label: string;
		icon: "cloud" | "laptop";
		models: BackendModel[];
	}

	let groupedModels = $derived.by(() => {
		const filtered = models
			.filter((el) => !el.unlisted)
			.filter((el) => {
				const haystack = normalize(`${el.id} ${el.name ?? ""} ${el.displayName ?? ""}`);
				return queryTokens.every((q) => haystack.includes(q));
			});

		const groups: Record<string, ModelGroup> = {
			cloud: { category: "cloud", label: "Cloud Models", icon: "cloud", models: [] },
			ollama: { category: "ollama", label: "Ollama", icon: "laptop", models: [] },
			lmstudio: { category: "lmstudio", label: "LM Studio", icon: "laptop", models: [] },
			local: { category: "local", label: "Local Models", icon: "laptop", models: [] },
		};

		for (const model of filtered) {
			const category = getProviderCategory(model);
			groups[category].models.push(model);
		}

		// Add local models from localModels store
		const ollamaLocalModels = $localModels.ollama
			.map(localToBackendModel)
			.filter((m) => {
				const haystack = normalize(`${m.id} ${m.name ?? ""} ${m.displayName ?? ""}`);
				return queryTokens.every((q) => haystack.includes(q));
			});
		const lmstudioLocalModels = $localModels.lmstudio
			.map(localToBackendModel)
			.filter((m) => {
				const haystack = normalize(`${m.id} ${m.name ?? ""} ${m.displayName ?? ""}`);
				return queryTokens.every((q) => haystack.includes(q));
			});

		// Add to groups (avoid duplicates by checking id)
		const existingOllamaIds = new Set(groups.ollama.models.map((m) => m.id));
		for (const m of ollamaLocalModels) {
			if (!existingOllamaIds.has(m.id)) {
				groups.ollama.models.push(m);
			}
		}

		const existingLmStudioIds = new Set(groups.lmstudio.models.map((m) => m.id));
		for (const m of lmstudioLocalModels) {
			if (!existingLmStudioIds.has(m.id)) {
				groups.lmstudio.models.push(m);
			}
		}

		// Return only non-empty groups, with cloud first
		return Object.values(groups).filter((g) => g.models.length > 0);
	});

	let filteredModels = $derived(
		models
			.filter((el) => !el.unlisted)
			.filter((el) => {
				const haystack = normalize(`${el.id} ${el.name ?? ""} ${el.displayName ?? ""}`);
				return queryTokens.every((q) => haystack.includes(q));
			})
	);

	// Find model in cloud models OR local models
	let selectedModel = $derived.by(() => {
		if (!selectedModelId) return undefined;

		// First check cloud models
		const cloudModel = models.find((m) => m.id === selectedModelId);
		if (cloudModel) return cloudModel;

		// Check local Ollama models
		const ollamaModel = $localModels.ollama.find((m) => m.id === selectedModelId);
		if (ollamaModel) return localToBackendModel(ollamaModel);

		// Check local LM Studio models
		const lmstudioModel = $localModels.lmstudio.find((m) => m.id === selectedModelId);
		if (lmstudioModel) return localToBackendModel(lmstudioModel);

		return undefined;
	});

	type RouterProvider = { provider: string } & Record<string, unknown>;
	let providerList = $derived((selectedModel?.providers ?? []) as RouterProvider[]);

	// Functional bindings for selected model settings
	function getToolsOverride() {
		if (!selectedModelId) return false;
		return $settings.toolsOverrides?.[selectedModelId] ?? false;
	}
	function setToolsOverride(v: boolean) {
		if (!selectedModelId) return;
		settings.update((s) => ({
			...s,
			toolsOverrides: { ...s.toolsOverrides, [selectedModelId!]: v },
		}));
	}
	function getMultimodalOverride() {
		if (!selectedModelId) return false;
		return $settings.multimodalOverrides?.[selectedModelId] ?? false;
	}
	function setMultimodalOverride(v: boolean) {
		if (!selectedModelId) return;
		settings.update((s) => ({
			...s,
			multimodalOverrides: { ...s.multimodalOverrides, [selectedModelId!]: v },
		}));
	}
	function getHidePromptExamples() {
		if (!selectedModelId) return false;
		return $settings.hidePromptExamples?.[selectedModelId] ?? false;
	}
	function setHidePromptExamples(v: boolean) {
		if (!selectedModelId) return;
		settings.update((s) => ({
			...s,
			hidePromptExamples: { ...s.hidePromptExamples, [selectedModelId!]: v },
		}));
	}
	function getCustomPrompt() {
		if (!selectedModelId) return "";
		return $settings.customPrompts?.[selectedModelId] ?? "";
	}
	function setCustomPrompt(v: string) {
		if (!selectedModelId) return;
		settings.update((s) => ({
			...s,
			customPrompts: { ...s.customPrompts, [selectedModelId!]: v },
		}));
	}

	let hasCustomPreprompt = $derived(
		selectedModelId
			? $settings.customPrompts?.[selectedModelId] !== selectedModel?.preprompt
			: false
	);

	// Initialize settings for selected model
	$effect(() => {
		if (selectedModel && selectedModelId) {
			const defaultPreprompt = selectedModel.preprompt || "";
			settings.initValue("customPrompts", selectedModelId, defaultPreprompt);
			settings.initValue("multimodalOverrides", selectedModelId, !!selectedModel.multimodal);
			settings.initValue(
				"toolsOverrides",
				selectedModelId,
				Boolean((selectedModel as unknown as { supportsTools?: boolean }).supportsTools)
			);
			settings.initValue("hidePromptExamples", selectedModelId, false);
		}
	});
</script>

<div class="flex h-full flex-col gap-4">
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Models</h2>

	<div class="flex min-h-0 flex-1 gap-4">
		<!-- Model List -->
		<div
			class="flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
			class:hidden={selectedModelId && window.innerWidth < 768}
		>
			<div class="flex-shrink-0 border-b border-gray-200 p-2 dark:border-gray-700">
				<input
					bind:value={modelFilter}
					type="search"
					placeholder="Search models..."
					aria-label="Search models"
					class="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
				/>
			</div>
			<div class="scrollbar-custom flex-1 overflow-y-auto p-1">
				{#each groupedModels as group}
					<!-- Category Header -->
					<div class="sticky top-0 z-10 flex items-center gap-1.5 bg-white px-2 py-1.5 dark:bg-gray-800">
						{#if group.icon === "cloud"}
							<CarbonCloud class="size-3.5 text-gray-400" />
						{:else}
							<CarbonLaptop class="size-3.5 text-gray-400" />
						{/if}
						<span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
							{group.label}
						</span>
						<span class="text-[10px] text-gray-400">({group.models.length})</span>
					</div>
					{#each group.models as model}
						<button
							type="button"
							onclick={() => (selectedModelId = model.id)}
							class="group flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/60 {model.id ===
							selectedModelId
								? '!bg-gray-100 !text-gray-900 dark:!bg-gray-700 dark:!text-white'
								: ''}"
						>
							<span class="flex-1 truncate">{model.displayName}</span>
							{#if model.isRouter}
								<IconOmni />
							{/if}
							{#if $settings.toolsOverrides?.[model.id] ?? (model as { supportsTools?: boolean }).supportsTools}
								<span
									class="grid size-[18px] flex-none place-items-center rounded bg-purple-500/10 text-purple-600 dark:text-purple-500"
								>
									<LucideHammer class="size-2.5" />
								</span>
							{/if}
							{#if $settings.multimodalOverrides?.[model.id] ?? model.multimodal}
								<span
									class="grid size-[18px] flex-none place-items-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-500"
								>
									<LucideImage class="size-2.5" />
								</span>
							{/if}
							{#if $settings.customPrompts?.[model.id]}
								<CarbonTextLongParagraph class="size-4 text-gray-500 dark:text-gray-400" />
							{/if}
							{#if model.id === $settings.activeModel}
								<span
									class="rounded bg-black/90 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-black"
								>
									Active
								</span>
							{/if}
						</button>
					{/each}
				{/each}
			</div>
		</div>

		<!-- Model Details -->
		<div
			class="scrollbar-custom flex-1 overflow-y-auto"
			class:hidden={!selectedModelId && window.innerWidth < 768}
		>
			{#if selectedModel}
				<div class="flex flex-col gap-4">
					<!-- Back button (mobile) -->
					<button
						type="button"
						class="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 md:hidden"
						onclick={() => (selectedModelId = null)}
					>
						<CarbonChevronLeft class="size-4" />
						Back to models
					</button>

					<!-- Header -->
					<div class="flex flex-col gap-0.5">
						<h3 class="text-base font-semibold md:text-lg">
							{selectedModel.displayName}
						</h3>
						{#if selectedModel.description}
							<p class="line-clamp-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
								{selectedModel.description}
							</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex flex-wrap items-center gap-1.5">
						<button
							class="flex items-center rounded-full bg-black px-3 py-1.5 text-sm !text-white shadow-sm hover:bg-black/90 dark:bg-white/80 dark:!text-gray-900 dark:hover:bg-white/90"
							onclick={() => {
								if (!selectedModelId) return;
								settings.instantSet({ activeModel: selectedModelId });
								goto(`${base}/`);
							}}
						>
							<CarbonChat class="mr-1.5 text-sm" />
							New chat
						</button>

						{#if selectedModel.modelUrl}
							<a
								href={selectedModel.modelUrl}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60"
							>
								<CarbonArrowUpRight class="mr-1.5 shrink-0 text-xs" />
								Model page
							</a>
						{/if}

						{#if publicConfig.isHuggingChat && !selectedModel?.isRouter}
							<a
								href={"https://huggingface.co/playground?modelId=" + selectedModel.name}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60"
							>
								<CarbonCode class="mr-1.5 shrink-0 text-xs" />
								API Playground
							</a>
						{/if}
					</div>

					{#if isLocalModel(selectedModel)}
						<!-- Local Model Info -->
						<div
							class="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
						>
							<div class="flex items-center gap-2">
								<CarbonLaptop class="size-4 text-gray-500" />
								<span class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
									{selectedModel._localProvider === "ollama" ? "Ollama" : "LM Studio"} Local Model
								</span>
							</div>
							<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-600 dark:text-gray-400">
								<div>
									<span class="font-medium">ID:</span>
									<span class="font-mono">{selectedModel.name}</span>
								</div>
								{#if selectedModel._size}
									<div>
										<span class="font-medium">Size:</span>
										<span>{formatBytes(selectedModel._size)}</span>
									</div>
								{/if}
								{#if selectedModel._modifiedAt}
									<div>
										<span class="font-medium">Modified:</span>
										<span>{new Date(selectedModel._modifiedAt).toLocaleDateString()}</span>
									</div>
								{/if}
							</div>
							<p class="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
								This model is running locally on your machine via {selectedModel._localProvider === "ollama" ? "Ollama" : "LM Studio"}.
							</p>
						</div>
					{/if}

					{#if selectedModel?.isRouter}
						<p class="rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-white/5">
							<IconOmni classNames="-translate-y-px" /> Omni routes your messages to the best model.
						</p>
					{/if}

					<!-- System Prompt -->
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<h4 class="text-[15px] font-semibold text-gray-800 dark:text-gray-200">
								System Prompt
							</h4>
							{#if hasCustomPreprompt}
								<button
									class="text-xs underline decoration-gray-300 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400"
									onclick={() => {
										if (!selectedModelId || !selectedModel) return;
										settings.update((s) => ({
											...s,
											customPrompts: {
												...s.customPrompts,
												[selectedModelId!]: selectedModel!.preprompt || "",
											},
										}));
									}}
								>
									Reset
								</button>
							{/if}
						</div>
						<textarea
							rows="6"
							class="w-full resize-none rounded-md border border-gray-200 bg-gray-50 p-2 text-[13px] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
							bind:value={getCustomPrompt, setCustomPrompt}
						></textarea>
					</div>

					<!-- Capabilities -->
					<div
						class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
					>
						<div class="divide-y divide-gray-200 dark:divide-gray-700">
							<div class="flex items-start justify-between py-3">
								<div>
									<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
										Tool calling
									</div>
									<p class="text-[12px] text-gray-500 dark:text-gray-400">
										Enable tools and function calling.
									</p>
								</div>
								<Switch name="forceTools" bind:checked={getToolsOverride, setToolsOverride} />
							</div>

							<div class="flex items-start justify-between py-3">
								<div>
									<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
										Multimodal
									</div>
									<p class="text-[12px] text-gray-500 dark:text-gray-400">
										Enable image uploads and inputs.
									</p>
								</div>
								<Switch
									name="forceMultimodal"
									bind:checked={getMultimodalOverride, setMultimodalOverride}
								/>
							</div>

							{#if selectedModel?.isRouter}
								<div class="flex items-start justify-between py-3">
									<div>
										<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
											Hide prompts
										</div>
										<p class="text-[12px] text-gray-500 dark:text-gray-400">
											Hide prompt suggestions above input.
										</p>
									</div>
									<Switch
										name="hidePromptExamples"
										bind:checked={getHidePromptExamples, setHidePromptExamples}
									/>
								</div>
							{/if}
						</div>
					</div>

					<!-- Providers -->
					{#if providerList.length}
						<div
							class="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800"
						>
							<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
								Inference Providers
							</div>
							<p class="mb-2 text-[12px] text-gray-500 dark:text-gray-400">
								Providers serving this model.
							</p>
							<ul class="flex flex-wrap gap-2">
								{#each providerList as prov, i (prov.provider || i)}
									{@const hubOrg =
										PROVIDERS_HUB_ORGS[prov.provider as keyof typeof PROVIDERS_HUB_ORGS]}
									<li>
										<span
											class="flex items-center gap-1 rounded-md bg-gray-100 py-0.5 pl-1.5 pr-2 text-xs text-gray-700 dark:bg-gray-700/60 dark:text-gray-200"
										>
											{#if hubOrg}
												<img
													src="https://huggingface.co/api/avatars/{hubOrg}"
													alt="{prov.provider} logo"
													class="size-2.5 flex-none rounded-sm"
													onerror={(e) =>
														((e.currentTarget as HTMLImageElement).style.display = "none")}
												/>
											{/if}
											{prov.provider}
										</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
					<p class="text-sm">Select a model to view details</p>
				</div>
			{/if}
		</div>
	</div>
</div>
