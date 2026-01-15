<script lang="ts">
  import { parseLucideTags, type ParsedContent } from 'lucide-emoji/sanitizer'
  import Icon from '@iconify/svelte'

  interface Props {
    text: string
    iconClass?: string
    iconSize?: number
  }

  let { text, iconClass = 'inline', iconSize = 16 }: Props = $props()

  const parts = $derived(parseLucideTags(text))
</script>

{#each parts as part}
  {#if part.type === 'text'}
    {part.content}
  {:else if part.type === 'icon' && part.iconName}
    <Icon
      icon="lucide:{part.iconName}"
      class={iconClass}
      width={iconSize}
      height={iconSize}
    />
  {/if}
{/each}
