<script lang="ts">
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";
	import CarbonLogoGithub from "~icons/carbon/logo-github";

	import { useSettingsStore } from "$lib/stores/settings";
	import Switch from "$lib/components/Switch.svelte";
	import { goto } from "$app/navigation";
	import { error } from "$lib/stores/errors";
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import { onMount } from "svelte";

	const publicConfig = usePublicConfig();
	let settings = useSettingsStore();
	const client = useAPIClient();

	let OPENAI_BASE_URL = $state<string | null>(null);

	// Billing organization state
	type BillingOrg = { sub: string; name: string; preferred_username: string };
	let billingOrgs = $state<BillingOrg[]>([]);
	let billingOrgsLoading = $state(false);
	let billingOrgsError = $state<string | null>(null);

	function getShareWithAuthors() {
		return $settings.shareConversationsWithModelAuthors;
	}
	function setShareWithAuthors(v: boolean) {
		settings.update((s) => ({ ...s, shareConversationsWithModelAuthors: v }));
	}
	function getDisableStream() {
		return $settings.disableStream;
	}
	function setDisableStream(v: boolean) {
		settings.update((s) => ({ ...s, disableStream: v }));
	}
	function getDirectPaste() {
		return $settings.directPaste;
	}
	function setDirectPaste(v: boolean) {
		settings.update((s) => ({ ...s, directPaste: v }));
	}

	function getBillingOrganization() {
		return $settings.billingOrganization ?? "";
	}
	function setBillingOrganization(v: string) {
		settings.update((s) => ({ ...s, billingOrganization: v }));
	}

	// Admin: model refresh UI state
	let refreshing = $state(false);
	let refreshMessage = $state<string | null>(null);

	onMount(async () => {
		try {
			const cfg = await client.debug.config.get().then(handleResponse);
			OPENAI_BASE_URL = (cfg as { OPENAI_BASE_URL?: string }).OPENAI_BASE_URL || null;
		} catch {
			// ignore if debug endpoint is unavailable
		}

		// Fetch billing organizations (only for HuggingChat + logged in users)
		if (publicConfig.isHuggingChat && page.data.user) {
			billingOrgsLoading = true;
			try {
				const data = (await client.user["billing-orgs"].get().then(handleResponse)) as {
					userCanPay: boolean;
					organizations: BillingOrg[];
					currentBillingOrg?: string;
				};
				billingOrgs = data.organizations ?? [];
				if (data.currentBillingOrg !== getBillingOrganization()) {
					setBillingOrganization(data.currentBillingOrg ?? "");
				}
			} catch {
				billingOrgsError = "Failed to load billing options";
			} finally {
				billingOrgsLoading = false;
			}
		}
	});
</script>

<div class="flex w-full flex-col gap-4">
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">General</h2>

	{#if OPENAI_BASE_URL !== null}
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-700 dark:border-gray-700 dark:bg-gray-700/80 dark:text-gray-300"
		>
			<span class="font-medium">API Base URL:</span>
			<code class="ml-1 break-all font-mono text-[12px] text-gray-800 dark:text-gray-100"
				>{OPENAI_BASE_URL}</code
			>
		</div>
	{/if}

	{#if !!publicConfig.PUBLIC_COMMIT_SHA}
		<div class="flex flex-col items-start text-sm text-gray-500 dark:text-gray-400">
			<a
				href={`https://github.com/huggingface/chat-ui/commit/${publicConfig.PUBLIC_COMMIT_SHA}`}
				target="_blank"
				rel="noreferrer"
				class="text-sm font-light"
			>
				Build: <span class="font-mono">{publicConfig.PUBLIC_COMMIT_SHA.slice(0, 7)}</span>
			</a>
		</div>
	{/if}

	{#if page.data.isAdmin}
		<div class="flex items-center gap-2">
			<p
				class="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
			>
				Admin
			</p>
			<button
				class="btn rounded-md text-xs"
				class:underline={!refreshing}
				type="button"
				onclick={async () => {
					try {
						refreshing = true;
						refreshMessage = null;
						const res = await client.models.refresh.post().then(handleResponse);
						const delta = `+${res.added.length} −${res.removed.length} ~${res.changed.length}`;
						refreshMessage = `Refreshed • ${delta} • total ${res.total}`;
					} catch (e) {
						console.error(e);
						$error = "Model refresh failed";
					} finally {
						refreshing = false;
					}
				}}
				disabled={refreshing}
			>
				{refreshing ? "Refreshing…" : "Refresh models"}
			</button>
			{#if refreshMessage}
				<span class="text-xs text-gray-600 dark:text-gray-400">{refreshMessage}</span>
			{/if}
		</div>
	{/if}

	<div
		class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="divide-y divide-gray-200 dark:divide-gray-700">
			{#if publicConfig.PUBLIC_APP_DATA_SHARING === "1"}
				<div class="flex items-start justify-between py-3">
					<div>
						<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
							Share with model authors
						</div>
						<p class="text-[12px] text-gray-500 dark:text-gray-400">
							Help improve open models over time.
						</p>
					</div>
					<Switch
						name="shareConversationsWithModelAuthors"
						bind:checked={getShareWithAuthors, setShareWithAuthors}
					/>
				</div>
			{/if}

			<div class="flex items-start justify-between py-3">
				<div>
					<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
						Disable streaming
					</div>
					<p class="text-[12px] text-gray-500 dark:text-gray-400">
						Show responses only when complete.
					</p>
				</div>
				<Switch name="disableStream" bind:checked={getDisableStream, setDisableStream} />
			</div>

			<div class="flex items-start justify-between py-3">
				<div>
					<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
						Direct paste
					</div>
					<p class="text-[12px] text-gray-500 dark:text-gray-400">
						Paste long text directly instead of as a file.
					</p>
				</div>
				<Switch name="directPaste" bind:checked={getDirectPaste, setDirectPaste} />
			</div>
		</div>
	</div>

	<!-- Billing section (HuggingChat only) -->
	{#if publicConfig.isHuggingChat && page.data.user}
		<div
			class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				<div class="flex items-start justify-between py-3">
					<div>
						<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Billing</div>
						<p class="text-[12px] text-gray-500 dark:text-gray-400">
							Select personal or organization billing.
						</p>
					</div>
					<div class="flex items-center">
						{#if billingOrgsLoading}
							<span class="text-xs text-gray-500">Loading...</span>
						{:else if billingOrgsError}
							<span class="text-xs text-red-500">{billingOrgsError}</span>
						{:else}
							<select
								class="rounded-md border border-gray-300 bg-white px-1 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								value={getBillingOrganization()}
								onchange={(e) => setBillingOrganization(e.currentTarget.value)}
							>
								<option value="">Personal</option>
								{#each billingOrgs as org}
									<option value={org.preferred_username}>{org.name}</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>
				<div class="flex items-start justify-between py-3">
					<div>
						<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
							Provider Usage
						</div>
						<p class="text-[12px] text-gray-500 dark:text-gray-400">
							View provider usage and preferences.
						</p>
					</div>
					<a
						href={getBillingOrganization()
							? `https://huggingface.co/organizations/${getBillingOrganization()}/settings/inference-providers/overview`
							: "https://huggingface.co/settings/inference-providers/overview"}
						target="_blank"
						class="whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
					>
						View Usage
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- Links -->
	<div class="mt-4 flex flex-col gap-2 text-[13px]">
		{#if publicConfig.isHuggingChat}
			<a
				href="https://github.com/huggingface/chat-ui"
				target="_blank"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400"
			>
				<CarbonLogoGithub class="mr-1.5 shrink-0 text-sm" /> GitHub repository
			</a>
			<a
				href="https://huggingface.co/spaces/huggingchat/chat-ui/discussions/764"
				target="_blank"
				rel="noreferrer"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400"
			>
				<CarbonArrowUpRight class="mr-1.5 shrink-0 text-sm" /> Share feedback
			</a>
			<a
				href="{base}/privacy"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400"
			>
				<CarbonArrowUpRight class="mr-1.5 shrink-0 text-sm" /> About & Privacy
			</a>
		{/if}
		<button
			onclick={async (e) => {
				e.preventDefault();
				confirm("Are you sure you want to delete all conversations?") &&
					client.conversations
						.delete()
						.then(async () => {
							await goto(`${base}/`, { invalidateAll: true });
						})
						.catch((err) => {
							console.error(err);
							$error = err.message;
						});
			}}
			type="submit"
			class="flex items-center underline decoration-red-200 underline-offset-2 hover:decoration-red-500 dark:decoration-red-900 dark:hover:decoration-red-700"
		>
			<CarbonTrashCan class="mr-2 inline text-sm text-red-500" />Delete all conversations
		</button>
	</div>
</div>
