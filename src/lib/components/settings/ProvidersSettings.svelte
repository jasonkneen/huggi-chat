<script lang="ts">
	import { onMount } from "svelte";
	import { providerSettings } from "$lib/stores/providerSettings";
	import { localModels } from "$lib/stores/localModels";
	import Switch from "$lib/components/Switch.svelte";
	import CarbonCheckmarkFilled from "~icons/carbon/checkmark-filled";
	import CarbonErrorFilled from "~icons/carbon/error-filled";
	import CarbonWarningFilled from "~icons/carbon/warning-filled";
	import CarbonRenew from "~icons/carbon/renew";
	import CarbonFolderOpen from "~icons/carbon/folder-open";

	interface ElectronAPI {
		verifyCliPath?: (path: string) => Promise<{ valid: boolean; version?: string; error?: string }>;
		pickFile?: () => Promise<string | null>;
	}

	function getElectronAPI(): ElectronAPI | undefined {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (window as any).electronAPI;
	}

	let isElectron = $state(false);
	let verifying = $state<string | null>(null);
	let claudeCodeVersion = $state<string | null>(null);
	let codexVersion = $state<string | null>(null);
	let ollamaStatus = $state<"checking" | "online" | "offline" | null>(null);
	let lmStudioStatus = $state<"checking" | "online" | "offline" | null>(null);

	onMount(() => {
		isElectron = typeof window !== "undefined" && !!window.electronAPI;
	});

	async function verifyClaudeCode() {
		const api = getElectronAPI();
		if (!api?.verifyCliPath) return;

		verifying = "claudeCode";
		try {
			const result = await api.verifyCliPath($providerSettings.claudeCodePath);
			providerSettings.update((s) => ({ ...s, claudeCodeVerified: result.valid }));
			claudeCodeVersion = result.version || null;
		} catch {
			providerSettings.update((s) => ({ ...s, claudeCodeVerified: false }));
		} finally {
			verifying = null;
		}
	}

	async function verifyCodex() {
		const api = getElectronAPI();
		if (!api?.verifyCliPath) return;

		verifying = "codex";
		try {
			const result = await api.verifyCliPath($providerSettings.codexPath);
			providerSettings.update((s) => ({ ...s, codexVerified: result.valid }));
			codexVersion = result.version || null;
		} catch {
			providerSettings.update((s) => ({ ...s, codexVerified: false }));
		} finally {
			verifying = null;
		}
	}

	async function checkOllama() {
		ollamaStatus = "checking";
		localModels.setLoading("ollama", true);
		try {
			const res = await fetch("/api/providers/models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					provider: "ollama",
					baseUrl: $providerSettings.ollamaBaseUrl,
				}),
			});
			const data = await res.json();
			if (data.models && data.models.length > 0) {
				ollamaStatus = "online";
				providerSettings.update((s) => ({ ...s, ollamaVerified: true }));
				localModels.setOllamaModels(data.models);
			} else if (data.error) {
				ollamaStatus = "offline";
				providerSettings.update((s) => ({ ...s, ollamaVerified: false }));
				localModels.clearOllama();
			} else {
				// Connected but no models
				ollamaStatus = "online";
				providerSettings.update((s) => ({ ...s, ollamaVerified: true }));
				localModels.setOllamaModels([]);
			}
		} catch {
			ollamaStatus = "offline";
			providerSettings.update((s) => ({ ...s, ollamaVerified: false }));
			localModels.clearOllama();
		}
	}

	async function checkLmStudio() {
		lmStudioStatus = "checking";
		localModels.setLoading("lmstudio", true);
		try {
			const res = await fetch("/api/providers/models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					provider: "lmstudio",
					baseUrl: $providerSettings.lmStudioBaseUrl,
				}),
			});
			const data = await res.json();
			if (data.models && data.models.length > 0) {
				lmStudioStatus = "online";
				providerSettings.update((s) => ({ ...s, lmStudioVerified: true }));
				localModels.setLmStudioModels(data.models);
			} else if (data.error) {
				lmStudioStatus = "offline";
				providerSettings.update((s) => ({ ...s, lmStudioVerified: false }));
				localModels.clearLmStudio();
			} else {
				// Connected but no models loaded
				lmStudioStatus = "online";
				providerSettings.update((s) => ({ ...s, lmStudioVerified: true }));
				localModels.setLmStudioModels([]);
			}
		} catch {
			lmStudioStatus = "offline";
			providerSettings.update((s) => ({ ...s, lmStudioVerified: false }));
			localModels.clearLmStudio();
		}
	}

	async function browseFile(field: "claudeCodePath" | "codexPath") {
		const api = getElectronAPI();
		if (!api?.pickFile) return;

		const path = await api.pickFile();
		if (path) {
			providerSettings.update((s) => ({ ...s, [field]: path }));
		}
	}

	function getOllamaEnabled() {
		return $providerSettings.ollamaEnabled;
	}
	function setOllamaEnabled(v: boolean) {
		providerSettings.update((s) => ({ ...s, ollamaEnabled: v }));
	}

	function getLmStudioEnabled() {
		return $providerSettings.lmStudioEnabled;
	}
	function setLmStudioEnabled(v: boolean) {
		providerSettings.update((s) => ({ ...s, lmStudioEnabled: v }));
	}
</script>

<div class="flex w-full flex-col gap-4">
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Providers</h2>

	<!-- HuggingFace -->
	<div
		class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="border-b border-gray-200 px-3 py-3 dark:border-gray-700">
			<div class="flex items-center gap-2">
				<img
					src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
					alt="HuggingFace"
					class="size-5"
				/>
				<h3 class="text-[14px] font-semibold text-gray-800 dark:text-gray-200">HuggingFace</h3>
			</div>
		</div>
		<div class="px-3 py-3">
			<div class="flex flex-col gap-3">
				<div>
					<label class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
						API Token
					</label>
					<input
						type="password"
						placeholder="hf_..."
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
						value={$providerSettings.hfToken}
						oninput={(e) =>
							providerSettings.update((s) => ({ ...s, hfToken: e.currentTarget.value }))}
					/>
					<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
						Get your token from <a
							href="https://huggingface.co/settings/tokens"
							target="_blank"
							class="underline hover:text-gray-700 dark:hover:text-gray-300">huggingface.co/settings/tokens</a
						>
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Claude Code -->
	{#if isElectron}
		<div
			class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="border-b border-gray-200 px-3 py-3 dark:border-gray-700">
				<div class="flex items-center gap-2">
					<div
						class="flex size-5 items-center justify-center rounded bg-gradient-to-br from-orange-400 to-orange-600 text-white"
					>
						<span class="text-xs font-bold">C</span>
					</div>
					<h3 class="text-[14px] font-semibold text-gray-800 dark:text-gray-200">Claude Code</h3>
					{#if $providerSettings.claudeCodeVerified}
						<CarbonCheckmarkFilled class="ml-auto size-4 text-green-500" />
					{/if}
				</div>
			</div>
			<div class="px-3 py-3">
				<div class="flex flex-col gap-3">
					<div>
						<label class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
							CLI Path
						</label>
						<div class="flex gap-2">
							<input
								type="text"
								placeholder="/usr/local/bin/claude"
								class="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								value={$providerSettings.claudeCodePath}
								oninput={(e) =>
									providerSettings.update((s) => ({
										...s,
										claudeCodePath: e.currentTarget.value,
										claudeCodeVerified: false,
									}))}
							/>
							<button
								type="button"
								class="rounded-md border border-gray-300 px-2 py-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={() => browseFile("claudeCodePath")}
								title="Browse"
							>
								<CarbonFolderOpen class="size-4 text-gray-600 dark:text-gray-400" />
							</button>
							<button
								type="button"
								class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={verifyClaudeCode}
								disabled={verifying === "claudeCode"}
							>
								{#if verifying === "claudeCode"}
									<CarbonRenew class="size-4 animate-spin" />
								{:else}
									Verify
								{/if}
							</button>
						</div>
						{#if claudeCodeVersion}
							<p class="mt-1 text-[11px] text-green-600 dark:text-green-400">
								Version: {claudeCodeVersion}
							</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Codex -->
	{#if isElectron}
		<div
			class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="border-b border-gray-200 px-3 py-3 dark:border-gray-700">
				<div class="flex items-center gap-2">
					<div
						class="flex size-5 items-center justify-center rounded bg-gradient-to-br from-green-400 to-teal-600 text-white"
					>
						<span class="text-xs font-bold">X</span>
					</div>
					<h3 class="text-[14px] font-semibold text-gray-800 dark:text-gray-200">Codex</h3>
					{#if $providerSettings.codexVerified}
						<CarbonCheckmarkFilled class="ml-auto size-4 text-green-500" />
					{/if}
				</div>
			</div>
			<div class="px-3 py-3">
				<div class="flex flex-col gap-3">
					<div>
						<label class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
							CLI Path
						</label>
						<div class="flex gap-2">
							<input
								type="text"
								placeholder="/usr/local/bin/codex"
								class="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								value={$providerSettings.codexPath}
								oninput={(e) =>
									providerSettings.update((s) => ({
										...s,
										codexPath: e.currentTarget.value,
										codexVerified: false,
									}))}
							/>
							<button
								type="button"
								class="rounded-md border border-gray-300 px-2 py-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={() => browseFile("codexPath")}
								title="Browse"
							>
								<CarbonFolderOpen class="size-4 text-gray-600 dark:text-gray-400" />
							</button>
							<button
								type="button"
								class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={verifyCodex}
								disabled={verifying === "codex"}
							>
								{#if verifying === "codex"}
									<CarbonRenew class="size-4 animate-spin" />
								{:else}
									Verify
								{/if}
							</button>
						</div>
						{#if codexVersion}
							<p class="mt-1 text-[11px] text-green-600 dark:text-green-400">
								Version: {codexVersion}
							</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Local Models Section -->
	<h3 class="mt-2 text-[13px] font-semibold text-gray-600 dark:text-gray-400">Local Models</h3>

	<!-- Ollama -->
	<div
		class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="border-b border-gray-200 px-3 py-3 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<img src="https://ollama.com/public/ollama.png" alt="Ollama" class="size-5 rounded" />
					<h3 class="text-[14px] font-semibold text-gray-800 dark:text-gray-200">Ollama</h3>
					{#if ollamaStatus === "online"}
						<CarbonCheckmarkFilled class="size-4 text-green-500" />
					{:else if ollamaStatus === "offline"}
						<CarbonErrorFilled class="size-4 text-red-500" />
					{/if}
				</div>
				<Switch name="ollamaEnabled" bind:checked={getOllamaEnabled, setOllamaEnabled} />
			</div>
		</div>
		{#if $providerSettings.ollamaEnabled}
			<div class="px-3 py-3">
				<div class="flex flex-col gap-3">
					<div>
						<label class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
							Base URL
						</label>
						<div class="flex gap-2">
							<input
								type="text"
								placeholder="http://localhost:11434"
								class="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								value={$providerSettings.ollamaBaseUrl}
								oninput={(e) =>
									providerSettings.update((s) => ({
										...s,
										ollamaBaseUrl: e.currentTarget.value,
										ollamaVerified: false,
									}))}
							/>
							<button
								type="button"
								class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={checkOllama}
								disabled={ollamaStatus === "checking"}
							>
								{#if ollamaStatus === "checking"}
									<CarbonRenew class="size-4 animate-spin" />
								{:else}
									Test
								{/if}
							</button>
						</div>
						<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
							Make sure Ollama is running: <code class="font-mono">ollama serve</code>
						</p>
					</div>
				{#if $localModels.ollama.length > 0}
					<div class="mt-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
						<p class="text-[12px] font-medium text-gray-700 dark:text-gray-300">
							{$localModels.ollama.length} model{$localModels.ollama.length === 1 ? "" : "s"} available
						</p>
						<p class="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
							{$localModels.ollama.map((m) => m.displayName).join(", ")}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

	<!-- LM Studio -->
	<div
		class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="border-b border-gray-200 px-3 py-3 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div
						class="flex size-5 items-center justify-center rounded bg-gradient-to-br from-purple-500 to-pink-500 text-white"
					>
						<span class="text-[10px] font-bold">LM</span>
					</div>
					<h3 class="text-[14px] font-semibold text-gray-800 dark:text-gray-200">LM Studio</h3>
					{#if lmStudioStatus === "online"}
						<CarbonCheckmarkFilled class="size-4 text-green-500" />
					{:else if lmStudioStatus === "offline"}
						<CarbonErrorFilled class="size-4 text-red-500" />
					{/if}
				</div>
				<Switch name="lmStudioEnabled" bind:checked={getLmStudioEnabled, setLmStudioEnabled} />
			</div>
		</div>
		{#if $providerSettings.lmStudioEnabled}
			<div class="px-3 py-3">
				<div class="flex flex-col gap-3">
					<div>
						<label class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
							Base URL
						</label>
						<div class="flex gap-2">
							<input
								type="text"
								placeholder="http://localhost:1234/v1"
								class="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								value={$providerSettings.lmStudioBaseUrl}
								oninput={(e) =>
									providerSettings.update((s) => ({
										...s,
										lmStudioBaseUrl: e.currentTarget.value,
										lmStudioVerified: false,
									}))}
							/>
							<button
								type="button"
								class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
								onclick={checkLmStudio}
								disabled={lmStudioStatus === "checking"}
							>
								{#if lmStudioStatus === "checking"}
									<CarbonRenew class="size-4 animate-spin" />
								{:else}
									Test
								{/if}
							</button>
						</div>
						<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
							Enable "Local Server" in LM Studio settings
						</p>
					</div>
					{#if $localModels.lmstudio.length > 0}
						<div class="mt-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
							<p class="text-[12px] font-medium text-gray-700 dark:text-gray-300">
								{$localModels.lmstudio.length} model{$localModels.lmstudio.length === 1 ? "" : "s"} available
							</p>
							<p class="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
								{$localModels.lmstudio.map((m) => m.displayName).join(", ")}
							</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
