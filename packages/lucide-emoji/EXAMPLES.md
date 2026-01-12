# Examples

## Basic Usage

### Parse LLM Tags

```typescript
import { parseLucideTags } from '@yourusername/lucide-emoji'

// LLM outputs this:
const response = "Task complete <check-circle/> Click <play/> to continue"

// Parse it:
const parts = parseLucideTags(response)

// Result:
[
  { type: 'text', content: 'Task complete ' },
  { type: 'icon', content: '<check-circle/>', iconName: 'check-circle' },
  { type: 'text', content: ' Click ' },
  { type: 'icon', content: '<play/>', iconName: 'play' },
  { type: 'text', content: ' to continue' }
]
```

### Convert Emojis

```typescript
import { sanitizeEmojis } from '@yourusername/lucide-emoji'

const text = "Meeting at 3pm ⏰ Don't forget! ✅"

// Convert to components:
const result = sanitizeEmojis(text, { format: 'component' })
// "Meeting at 3pm <AlarmClock /> Don't forget! <CheckCircle />"

// Convert to Lucide tags:
const result2 = sanitizeEmojis(text, { format: 'lucide-tag' })
// "Meeting at 3pm <lucide:alarm-clock /> Don't forget! <lucide:check-circle />"
```

## Prompting Examples

### System Prompt for LLM

```markdown
When you want to add icons to your responses, use this format: <icon-name/>

Examples:
- Status: <check-circle/> for complete, <clock/> for pending, <x-circle/> for failed
- Actions: <play/> start, <pause/> pause, <stop/> stop
- Alerts: <alert-triangle/> warning, <info/> information, <alert-circle/> error
- Navigation: <arrow-right/> next, <arrow-left/> back, <home/> home

Use descriptive names - they'll map to Lucide icons automatically.
```

### Example Conversation

```
User: What's the status of my tasks?

AI: Here's your task status:
1. Write documentation <check-circle/> Complete
2. Review PR <clock/> In Progress
3. Deploy to production <alert-triangle/> Blocked
4. Send email <circle/> Not Started

Click <arrow-right/> to see details or <settings/> to change priorities.
```

## Framework Examples

### React with lucide-react

```tsx
import { parseLucideTags } from '@yourusername/lucide-emoji'
import * as LucideIcons from 'lucide-react'

function MessageWithIcons({ text }: { text: string }) {
  const parts = parseLucideTags(text)

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'icon' && part.iconName) {
          // Convert kebab-case to PascalCase
          const iconName = part.iconName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('')

          const Icon = LucideIcons[iconName as keyof typeof LucideIcons]

          return Icon ? (
            <Icon key={i} size={16} className="inline mx-1" />
          ) : (
            <span key={i}>{part.content}</span>
          )
        }

        return <span key={i}>{part.content}</span>
      })}
    </div>
  )
}

// Usage:
<MessageWithIcons text="Task complete <check-circle/> Next: <arrow-right/>" />
```

### Svelte with @iconify/svelte

```svelte
<script lang="ts">
  import { parseLucideTags } from '@yourusername/lucide-emoji'
  import Icon from '@iconify/svelte'

  interface Props {
    text: string
    iconSize?: number
  }

  let { text, iconSize = 16 }: Props = $props()
  const parts = $derived(parseLucideTags(text))
</script>

<span class="inline-flex items-center gap-1">
  {#each parts as part}
    {#if part.type === 'icon' && part.iconName}
      <Icon
        icon="lucide:{part.iconName}"
        width={iconSize}
        height={iconSize}
        class="inline-block"
      />
    {:else}
      {part.content}
    {/if}
  {/each}
</span>

<!-- Usage: -->
<LucideText text="Click <play/> to start" iconSize={20} />
```

### Vue 3 with lucide-vue-next

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { parseLucideTags } from '@yourusername/lucide-emoji'
import * as icons from 'lucide-vue-next'

const props = defineProps<{ text: string }>()
const parts = computed(() => parseLucideTags(props.text))

function toPascalCase(str: string) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}
</script>

<template>
  <span>
    <template v-for="(part, i) in parts" :key="i">
      <component
        v-if="part.type === 'icon' && part.iconName"
        :is="icons[toPascalCase(part.iconName)]"
        :size="16"
        class="inline"
      />
      <span v-else>{{ part.content }}</span>
    </template>
  </span>
</template>

<!-- Usage: -->
<MessageWithIcons text="Status <check-circle/> Ready to deploy <rocket/>" />
```

## Advanced: Emoji Stats

```typescript
import { getEmojiStats } from '@yourusername/lucide-emoji'

const text = "Hello 👋 World ✅ Check this 🔥 Amazing 🦄"

const stats = getEmojiStats(text)
console.log(stats)
// {
//   total: 4,
//   mapped: 3,        // 👋, ✅, 🔥 have Lucide equivalents
//   unmapped: 1,      // 🦄 doesn't
//   mappedEmojis: ['👋', '✅', '🔥'],
//   unmappedEmojis: ['🦄']
// }
```

## Advanced: Selective Replacement

```typescript
import { sanitizeEmojis, extractEmojis } from '@yourusername/lucide-emoji'

const text = "Important ⚠️ Meeting ⏰ at 3pm 👋"

// Replace only specific emojis:
const extracted = extractEmojis(text)
const warnings = extracted.filter(e => e.emoji === '⚠️')

// Or use custom logic:
let result = text
for (const { emoji, lucideName } of extracted) {
  if (lucideName) {
    // Only replace if Lucide equivalent exists
    result = result.replace(emoji, `<${lucideName}/>`)
  }
}
```

## Real-World: Chat Message Component

```typescript
import { parseLucideTags } from '@yourusername/lucide-emoji'
import * as LucideIcons from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function ChatMessage({ content }: { content: string }) {
  // First parse Lucide tags
  const parts = parseLucideTags(content)

  // Render with markdown support
  return (
    <div className="message">
      {parts.map((part, i) => {
        if (part.type === 'icon' && part.iconName) {
          const iconName = part.iconName
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join('')

          const Icon = LucideIcons[iconName as keyof typeof LucideIcons]

          return Icon ? (
            <Icon
              key={i}
              size={18}
              className="inline-block mx-1 text-blue-500"
            />
          ) : null
        }

        // Render text with markdown
        return (
          <ReactMarkdown key={i} className="inline">
            {part.content}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}
```
