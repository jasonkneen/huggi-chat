<script lang="ts">
	import type { ToolFront } from "$lib/types/Tool";
	import LucideHammer from "~icons/lucide/hammer";
	import LucideX from "~icons/lucide/x";
	import LucidePlay from "~icons/lucide/play";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import { base } from "$app/paths";
	import { onMount } from "svelte";

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	interface ToolWithParams extends ToolFront {
		parameters?: unknown;
	}

	let tools = $state<ToolWithParams[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await fetch(`${base}/api/tools`);
			if (!response.ok) throw new Error("Failed to load tools");
			const data = await response.json();
			tools = data.tools || [];
		} catch (err) {
			loadError = err instanceof Error ? err.message : "Failed to load tools";
		} finally {
			isLoading = false;
		}
	});

	let selectedTool: ToolFront | null = $state(null);
	let mockResult = $state<string | null>(null);
	let isExecuting = $state(false);

	function generateMockData(tool: ToolWithParams): Record<string, unknown> {
		const schema = tool.parameters;
		if (!schema || typeof schema !== "object") return {};

		const props = (schema as { properties?: Record<string, unknown> }).properties;
		const required = (schema as { required?: string[] }).required || [];
		if (!props) return {};

		const mockData: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(props)) {
			const prop = value as { type?: string; description?: string; enum?: string[]; default?: unknown };
			const isRequired = required.includes(key);

			// Skip optional parameters to use defaults
			if (!isRequired) continue;

			if (prop.enum && prop.enum.length > 0) {
				mockData[key] = prop.enum[0];
			} else if (prop.default !== undefined) {
				mockData[key] = prop.default;
			} else {
				switch (prop.type) {
					case "string":
						if (prop.description?.toLowerCase().includes("path")) {
							mockData[key] = ".";
						} else if (prop.description?.toLowerCase().includes("url")) {
							mockData[key] = "https://example.com";
						} else if (key === "path") {
							mockData[key] = ".";
						} else {
							mockData[key] = "example";
						}
						break;
					case "number":
					case "integer":
						mockData[key] = 42;
						break;
					case "boolean":
						mockData[key] = true;
						break;
					case "array":
						mockData[key] = ["item1"];
						break;
					case "object":
						mockData[key] = {};
						break;
					default:
						mockData[key] = "example";
				}
			}
		}

		return mockData;
	}

	async function executeMockTool(tool: ToolWithParams) {
		selectedTool = tool;
		isExecuting = true;
		mockResult = null;

		try {
			// Generate mock input parameters
			const mockInput = generateMockData(tool);

			// Execute the ACTUAL tool
			const response = await fetch(`${base}/api/tools/execute`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					toolName: tool.name,
					arguments: mockInput,
				}),
			});

			const data = await response.json();

			if (data.success) {
				mockResult = data.result;
			} else {
				mockResult = JSON.stringify({ error: data.error || "Execution failed" }, null, 2);
			}
		} catch (err) {
			mockResult = JSON.stringify(
				{ error: err instanceof Error ? err.message : "Unknown error" },
				null,
				2
			);
		} finally {
			isExecuting = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
	onclick={onclose}
>
	<div
		class="relative mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border-2 border-purple-400/60 bg-white shadow-2xl ring-4 ring-purple-500/30 dark:border-purple-500/60 dark:bg-gray-800 dark:ring-purple-400/40"
		onclick={(e) => e.stopPropagation()}
		style="box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.25);"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
			<div class="flex items-center gap-3">
				<div
					class="flex size-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40"
				>
					<LucideHammer class="size-5 text-purple-600 dark:text-purple-400" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Tool Debugger</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Execute tools with generated parameters
					</p>
				</div>
			</div>
			<button
				type="button"
				onclick={onclose}
				class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
			>
				<LucideX class="size-5" />
			</button>
		</div>

		<!-- Content -->
		<div class="grid max-h-[70vh] grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
			<!-- Tool List -->
			<div class="overflow-y-auto p-4">
				<h3 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
					Available Tools ({tools.length})
				</h3>
				{#if isLoading}
					<div class="flex items-center justify-center py-12">
						<div class="space-y-3 text-center">
							<div
								class="mx-auto size-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent dark:border-purple-400"
							></div>
							<p class="text-sm text-gray-500 dark:text-gray-400">Loading tools...</p>
						</div>
					</div>
				{:else if loadError}
					<div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-900/20">
						<p class="text-sm text-red-600 dark:text-red-400">{loadError}</p>
					</div>
				{:else if tools.length === 0}
					<div class="flex items-center justify-center py-12">
						<p class="text-sm text-gray-500 dark:text-gray-400">No tools available</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each tools as tool}
							<button
								type="button"
								class="group w-full rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:hover:border-purple-500/50 dark:hover:bg-purple-900/10 {selectedTool?.name ===
								tool.name
									? 'border-purple-400 bg-purple-50 dark:border-purple-500 dark:bg-purple-900/20'
									: ''}"
								onclick={() => executeMockTool(tool)}
							>
								<div class="flex items-start justify-between gap-2">
									<div class="flex-1 space-y-1">
										<div class="flex items-center gap-2">
											<span class="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
												{tool.displayName || tool.name}
											</span>
											{#if selectedTool?.name === tool.name}
												<CarbonCheckmark
													class="size-4 text-purple-600 dark:text-purple-400"
												/>
											{/if}
										</div>
										<p class="text-xs text-gray-500 dark:text-gray-400">
											{tool.description || "No description"}
										</p>
									</div>
									<LucidePlay
										class="size-4 text-gray-400 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400"
									/>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Mock Result -->
			<div class="overflow-y-auto p-4">
				{#if !selectedTool}
					<div class="flex h-full items-center justify-center text-center">
						<div class="space-y-2">
							<LucideHammer class="mx-auto size-12 text-gray-300 dark:text-gray-600" />
							<p class="text-sm text-gray-500 dark:text-gray-400">
								Select a tool to execute
							</p>
						</div>
					</div>
				{:else}
					<div class="space-y-4">
						<!-- Tool name -->
						<div>
							<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
								{selectedTool.displayName || selectedTool.name}
							</h3>
						</div>

						<!-- Generated input -->
						<div class="space-y-2">
							<h4
								class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
							>
								Generated Input
							</h4>
							<div
								class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50"
							>
								<pre
									class="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-gray-600 dark:text-gray-300">{JSON.stringify(
										generateMockData(selectedTool),
										null,
										2
									)}</pre>
							</div>
						</div>

						<!-- Mock output -->
						{#if isExecuting}
							<div class="space-y-2">
								<h4
									class="text-[10px] font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400"
								>
									Executing...
								</h4>
								<div
									class="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/30 dark:bg-purple-900/20"
								>
									<div class="size-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent dark:border-purple-400"></div>
									<span class="text-sm text-purple-700 dark:text-purple-300">Running tool...</span>
								</div>
							</div>
						{:else if mockResult}
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<h4
										class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
									>
										Tool Output
									</h4>
									<div class="flex items-center gap-1">
										<CarbonCheckmark class="size-3 text-emerald-500" />
										<span class="text-[10px] text-emerald-600 dark:text-emerald-400"
											>Success</span
										>
									</div>
								</div>
								<div
									class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-900/20"
								>
									<pre
										class="max-h-96 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-gray-600 dark:text-gray-300">{mockResult}</pre>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="border-t border-gray-200 p-4 dark:border-gray-700">
			<p class="text-xs text-gray-500 dark:text-gray-400">
				This debugger executes actual tool calls with auto-generated parameters. Use with caution.
			</p>
		</div>
	</div>
</div>
