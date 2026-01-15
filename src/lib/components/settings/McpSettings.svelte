<script lang="ts">
	import {
		allMcpServers,
		selectedServerIds,
		toggleServer,
		addCustomServer,
		deleteCustomServer,
		healthCheckServer,
		refreshMcpServers,
	} from "$lib/stores/mcpServers";
	import type { MCPServer, MCPTransport, KeyValuePair } from "$lib/types/Tool";
	import Switch from "$lib/components/Switch.svelte";
	import CarbonAdd from "~icons/carbon/add";
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonRenew from "~icons/carbon/renew";
	import CarbonCheckmarkFilled from "~icons/carbon/checkmark-filled";
	import CarbonErrorFilled from "~icons/carbon/error-filled";
	import CarbonWarningFilled from "~icons/carbon/warning-filled";
	import CarbonChevronDown from "~icons/carbon/chevron-down";
	import CarbonChevronRight from "~icons/carbon/chevron-right";
	import CarbonPlugFilled from "~icons/carbon/plug-filled";
	import CarbonClose from "~icons/carbon/close";

	let showAddForm = $state(false);
	let newServerName = $state("");
	let newTransport = $state<MCPTransport>("http");
	// HTTP fields
	let newServerUrl = $state("");
	let newHeaders = $state<KeyValuePair[]>([]);
	// Stdio fields
	let newCommand = $state("");
	let newArgs = $state("");
	let newEnvVars = $state<KeyValuePair[]>([]);

	let expandedServer = $state<string | null>(null);
	let refreshing = $state<string | null>(null);

	let baseServers = $derived($allMcpServers.filter((s) => s.type === "base"));
	let customServers = $derived($allMcpServers.filter((s) => s.type === "custom"));

	function getServerEnabled(id: string) {
		return $selectedServerIds.has(id);
	}

	function resetForm() {
		newServerName = "";
		newTransport = "http";
		newServerUrl = "";
		newHeaders = [];
		newCommand = "";
		newArgs = "";
		newEnvVars = [];
		showAddForm = false;
	}

	function canAddServer() {
		if (!newServerName.trim()) return false;
		if (newTransport === "http") {
			return newServerUrl.trim().length > 0;
		} else {
			return newCommand.trim().length > 0;
		}
	}

	async function handleAddServer() {
		if (!canAddServer()) return;

		const serverData: Omit<MCPServer, "id" | "type" | "status"> = {
			name: newServerName.trim(),
			transport: newTransport,
		};

		if (newTransport === "http") {
			serverData.url = newServerUrl.trim();
			if (newHeaders.length > 0) {
				serverData.headers = newHeaders.filter((h) => h.key.trim());
			}
		} else {
			serverData.command = newCommand.trim();
			if (newArgs.trim()) {
				// Split by newlines or commas, trim whitespace
				serverData.args = newArgs
					.split(/[\n,]/)
					.map((a) => a.trim())
					.filter((a) => a.length > 0);
			}
			if (newEnvVars.length > 0) {
				serverData.env = newEnvVars.filter((e) => e.key.trim());
			}
		}

		addCustomServer(serverData);
		resetForm();
	}

	async function handleRefresh(server: MCPServer) {
		refreshing = server.id;
		await healthCheckServer(server);
		refreshing = null;
	}

	async function handleRefreshAll() {
		await refreshMcpServers();
	}

	function toggleExpanded(serverId: string) {
		expandedServer = expandedServer === serverId ? null : serverId;
	}

	function getStatusIcon(status: string | undefined): { icon: typeof CarbonCheckmarkFilled; class: string } {
		switch (status) {
			case "connected":
				return { icon: CarbonCheckmarkFilled, class: "text-green-500" };
			case "connecting":
				return { icon: CarbonRenew, class: "text-yellow-500 animate-spin" };
			case "error":
				return { icon: CarbonErrorFilled, class: "text-red-500" };
			default:
				return { icon: CarbonWarningFilled, class: "text-gray-400" };
		}
	}

	function addHeader() {
		newHeaders = [...newHeaders, { key: "", value: "" }];
	}

	function removeHeader(index: number) {
		newHeaders = newHeaders.filter((_, i) => i !== index);
	}

	function addEnvVar() {
		newEnvVars = [...newEnvVars, { key: "", value: "" }];
	}

	function removeEnvVar(index: number) {
		newEnvVars = newEnvVars.filter((_, i) => i !== index);
	}

	function getServerConfigDisplay(server: MCPServer): string {
		if (server.transport === "http") {
			return server.url || "";
		} else {
			const parts = [server.command];
			if (server.args?.length) {
				parts.push(...server.args);
			}
			return parts.join(" ");
		}
	}
</script>

<div class="flex w-full flex-col gap-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">MCP Servers</h2>
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
			onclick={handleRefreshAll}
		>
			<CarbonRenew class="size-4" />
			Refresh All
		</button>
	</div>

	<p class="text-[13px] text-gray-600 dark:text-gray-400">
		Model Context Protocol servers provide tools and capabilities to models.
	</p>

	<!-- Base Servers -->
	{#if baseServers.length > 0}
		<div class="flex flex-col gap-2">
			<h3 class="text-[13px] font-semibold text-gray-600 dark:text-gray-400">System Servers</h3>
			<div
				class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each baseServers as server}
						{@const status = getStatusIcon(server.status)}
						{@const StatusIcon = status.icon}
						<div class="flex flex-col">
							<div class="flex items-center justify-between px-3 py-3">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="flex flex-1 cursor-pointer items-center gap-2"
									onclick={() => toggleExpanded(server.id)}
								>
									{#if expandedServer === server.id}
										<CarbonChevronDown class="size-4 text-gray-500" />
									{:else}
										<CarbonChevronRight class="size-4 text-gray-500" />
									{/if}
									<CarbonPlugFilled class="size-4 text-gray-500 dark:text-gray-400" />
									<span class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
										{server.name}
									</span>
									<span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
										{server.transport}
									</span>
									<StatusIcon class="size-4 {status.class}" />
									{#if server.tools?.length}
										<span class="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-400">
											{server.tools.length} tools
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<button
										type="button"
										class="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
										onclick={() => handleRefresh(server)}
										disabled={refreshing === server.id}
									>
										<CarbonRenew
											class="size-4 text-gray-500 {refreshing === server.id ? 'animate-spin' : ''}"
										/>
									</button>
									<Switch
										name={`server-${server.id}`}
										checked={getServerEnabled(server.id)}
										onchange={() => toggleServer(server.id)}
									/>
								</div>
							</div>
							{#if expandedServer === server.id}
								<div class="border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
									{#if server.description}
										<p class="mb-2 text-[12px] text-gray-600 dark:text-gray-400">
											{server.description}
										</p>
									{/if}
									<p class="mb-2 text-[11px] font-mono text-gray-500 dark:text-gray-500">
										{getServerConfigDisplay(server)}
									</p>
									{#if server.transport === "stdio" && server.env?.length}
										<div class="mb-2">
											<span class="text-[10px] font-semibold uppercase text-gray-500">Env:</span>
											{#each server.env as envVar}
												<span class="ml-1 text-[11px] font-mono text-gray-500">{envVar.key}={envVar.value}</span>
											{/each}
										</div>
									{/if}
									{#if server.errorMessage}
										<p class="mb-2 text-[12px] text-red-600 dark:text-red-400">
											Error: {server.errorMessage}
										</p>
									{/if}
									{#if server.tools?.length}
										<div class="mt-2">
											<h4 class="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
												Available Tools
											</h4>
											<div class="flex flex-wrap gap-1">
												{#each server.tools as tool}
													<span
														class="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-700 dark:bg-gray-700 dark:text-gray-300"
														title={tool.description}
													>
														{tool.name}
													</span>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Custom Servers -->
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<h3 class="text-[13px] font-semibold text-gray-600 dark:text-gray-400">Custom Servers</h3>
			<button
				type="button"
				class="flex items-center gap-1 rounded-md text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
				onclick={() => (showAddForm = !showAddForm)}
			>
				<CarbonAdd class="size-4" />
				Add Server
			</button>
		</div>

		{#if showAddForm}
			<div
				class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="flex flex-col gap-4">
					<!-- Server Name -->
					<div>
						<label for="new-server-name" class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
							Server Name
						</label>
						<input
							id="new-server-name"
							type="text"
							placeholder="My MCP Server"
							class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
							bind:value={newServerName}
						/>
					</div>

					<!-- Transport Type -->
					<div>
						<label class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
							Transport Type
						</label>
						<div class="flex gap-2">
							<button
								type="button"
								class="flex-1 rounded-md border px-3 py-2 text-sm transition-colors {newTransport === 'http'
									? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
									: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
								onclick={() => (newTransport = "http")}
							>
								HTTP / SSE
							</button>
							<button
								type="button"
								class="flex-1 rounded-md border px-3 py-2 text-sm transition-colors {newTransport === 'stdio'
									? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
									: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
								onclick={() => (newTransport = "stdio")}
							>
								Stdio (Local)
							</button>
						</div>
					</div>

					{#if newTransport === "http"}
						<!-- HTTP: URL -->
						<div>
							<label for="new-server-url" class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
								Server URL
							</label>
							<input
								id="new-server-url"
								type="text"
								placeholder="https://mcp.example.com/sse"
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								bind:value={newServerUrl}
							/>
						</div>

						<!-- HTTP: Headers -->
						<div>
							<div class="mb-1 flex items-center justify-between">
								<label class="text-[12px] font-medium text-gray-700 dark:text-gray-300">
									Headers (optional)
								</label>
								<button
									type="button"
									class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
									onclick={addHeader}
								>
									+ Add Header
								</button>
							</div>
							{#if newHeaders.length > 0}
								<div class="flex flex-col gap-2">
									{#each newHeaders as header, i}
										<div class="flex items-center gap-2">
											<input
												type="text"
												placeholder="Header name"
												class="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
												bind:value={header.key}
											/>
											<input
												type="text"
												placeholder="Value"
												class="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
												bind:value={header.value}
											/>
											<button
												type="button"
												class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
												onclick={() => removeHeader(i)}
											>
												<CarbonClose class="size-4" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<!-- Stdio: Command -->
						<div>
							<label for="new-command" class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
								Command
							</label>
							<input
								id="new-command"
								type="text"
								placeholder="npx, python, node, etc."
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								bind:value={newCommand}
							/>
						</div>

						<!-- Stdio: Args -->
						<div>
							<label for="new-args" class="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
								Arguments (one per line or comma-separated)
							</label>
							<textarea
								id="new-args"
								placeholder={"-y\n@modelcontextprotocol/server-filesystem\n/path/to/dir"}
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								rows="3"
								bind:value={newArgs}
							></textarea>
						</div>

						<!-- Stdio: Environment Variables -->
						<div>
							<div class="mb-1 flex items-center justify-between">
								<label class="text-[12px] font-medium text-gray-700 dark:text-gray-300">
									Environment Variables (optional)
								</label>
								<button
									type="button"
									class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
									onclick={addEnvVar}
								>
									+ Add Variable
								</button>
							</div>
							{#if newEnvVars.length > 0}
								<div class="flex flex-col gap-2">
									{#each newEnvVars as envVar, i}
										<div class="flex items-center gap-2">
											<input
												type="text"
												placeholder="Variable name"
												class="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
												bind:value={envVar.key}
											/>
											<input
												type="text"
												placeholder="Value"
												class="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
												bind:value={envVar.value}
											/>
											<button
												type="button"
												class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
												onclick={() => removeEnvVar(i)}
											>
												<CarbonClose class="size-4" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
						<button
							type="button"
							class="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
							onclick={resetForm}
						>
							Cancel
						</button>
						<button
							type="button"
							class="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
							onclick={handleAddServer}
							disabled={!canAddServer()}
						>
							Add Server
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if customServers.length > 0}
			<div
				class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each customServers as server}
						{@const status = getStatusIcon(server.status)}
						{@const StatusIcon = status.icon}
						<div class="flex flex-col">
							<div class="flex items-center justify-between px-3 py-3">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="flex flex-1 cursor-pointer items-center gap-2"
									onclick={() => toggleExpanded(server.id)}
								>
									{#if expandedServer === server.id}
										<CarbonChevronDown class="size-4 text-gray-500" />
									{:else}
										<CarbonChevronRight class="size-4 text-gray-500" />
									{/if}
									<CarbonPlugFilled class="size-4 text-purple-500" />
									<span class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
										{server.name}
									</span>
									<span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
										{server.transport}
									</span>
									<StatusIcon class="size-4 {status.class}" />
									{#if server.tools?.length}
										<span class="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-400">
											{server.tools.length} tools
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<button
										type="button"
										class="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
										onclick={() => handleRefresh(server)}
										disabled={refreshing === server.id}
									>
										<CarbonRenew
											class="size-4 text-gray-500 {refreshing === server.id ? 'animate-spin' : ''}"
										/>
									</button>
									<button
										type="button"
										class="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
										onclick={() => {
											if (confirm(`Delete server "${server.name}"?`)) {
												deleteCustomServer(server.id);
											}
										}}
									>
										<CarbonTrashCan class="size-4" />
									</button>
									<Switch
										name={`server-${server.id}`}
										checked={getServerEnabled(server.id)}
										onchange={() => toggleServer(server.id)}
									/>
								</div>
							</div>
							{#if expandedServer === server.id}
								<div class="border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
									<p class="mb-2 text-[11px] font-mono text-gray-500 dark:text-gray-500">
										{getServerConfigDisplay(server)}
									</p>
									{#if server.transport === "stdio" && server.env?.length}
										<div class="mb-2">
											<span class="text-[10px] font-semibold uppercase text-gray-500">Env:</span>
											{#each server.env as envVar}
												<span class="ml-1 text-[11px] font-mono text-gray-500">{envVar.key}={envVar.value}</span>
											{/each}
										</div>
									{/if}
									{#if server.transport === "http" && server.headers?.length}
										<div class="mb-2">
											<span class="text-[10px] font-semibold uppercase text-gray-500">Headers:</span>
											{#each server.headers as header}
												<span class="ml-1 text-[11px] font-mono text-gray-500">{header.key}: {header.value}</span>
											{/each}
										</div>
									{/if}
									{#if server.errorMessage}
										<p class="mb-2 text-[12px] text-red-600 dark:text-red-400">
											Error: {server.errorMessage}
										</p>
									{/if}
									{#if server.tools?.length}
										<div class="mt-2">
											<h4 class="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
												Available Tools
											</h4>
											<div class="flex flex-wrap gap-1">
												{#each server.tools as tool}
													<span
														class="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-700 dark:bg-gray-700 dark:text-gray-300"
														title={tool.description}
													>
														{tool.name}
													</span>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{:else if !showAddForm}
			<div
				class="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-800/50"
			>
				<p class="text-sm text-gray-500 dark:text-gray-400">No custom servers added yet.</p>
			</div>
		{/if}
	</div>
</div>
