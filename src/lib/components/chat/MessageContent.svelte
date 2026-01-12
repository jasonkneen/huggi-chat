<script lang="ts">
  import { parseLucideTags } from '$lib/utils/lucide-emoji/emoji-sanitizer'
  import MarkdownRenderer from './MarkdownRenderer.svelte'
  import LucideIcon from './LucideIcon.svelte'

  interface Props {
    content: string
    loading?: boolean
  }

  let { content, loading = false }: Props = $props()

  // Parse content for Lucide tags
  const parts = $derived(parseLucideTags(content))
</script>

{#each parts as part, i (i)}
  {#if part.type === 'icon' && part.iconName}
    <LucideIcon name={part.iconName} size={18} />
  {:else if part.type === 'text' && part.content.trim()}
    <span class="inline">
      <MarkdownRenderer content={part.content} {loading} />
    </span>
  {/if}
{/each}
