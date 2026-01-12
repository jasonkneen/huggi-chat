<script lang="ts">
	import type { Token } from "$lib/utils/marked";
	import CodeBlock from "../CodeBlock.svelte";

	interface Props {
		tokens: Token[];
		loading?: boolean;
	}

	let { tokens, loading = false }: Props = $props();

	const renderedTokens = $derived(tokens);
</script>

<div class="streaming-content" class:is-streaming={loading}>
	{#each renderedTokens as token}
		{#if token.type === "text"}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html token.html}
		{:else if token.type === "code"}
			<CodeBlock code={token.code} rawCode={token.rawCode} loading={loading && !token.isClosed} />
		{/if}
	{/each}
</div>

<style>
	.streaming-content {
		transition: opacity 0.1s ease-out;
	}

	.streaming-content.is-streaming :global(p:last-of-type),
	.streaming-content.is-streaming :global(li:last-of-type),
	.streaming-content.is-streaming :global(pre:last-of-type),
	.streaming-content.is-streaming :global(h1:last-of-type),
	.streaming-content.is-streaming :global(h2:last-of-type),
	.streaming-content.is-streaming :global(h3:last-of-type) {
		animation: streamFadeIn 0.2s ease-out;
	}

	@keyframes streamFadeIn {
		from {
			opacity: 0.3;
			transform: translateY(2px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
