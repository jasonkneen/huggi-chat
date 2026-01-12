# 🎨 Lucide Emoji

Convert Unicode emojis to Lucide icons and parse LLM-generated Lucide tags.

Perfect for:
- Converting emoji-heavy LLM responses to clean, consistent icons
- Parsing custom icon tags from AI models (e.g., `<smile/>`)
- Building AI chat interfaces with icon support
- Sanitizing user-generated content with emoji

## 📦 Installation

```bash
npm install @yourusername/lucide-emoji
```

## 🚀 Quick Start

### Parse LLM Output with Lucide Tags

```typescript
import { parseLucideTags } from '@yourusername/lucide-emoji'

const llmResponse = "Here's a smile for you: <smile/> Task complete <check-circle/>"
const parts = parseLucideTags(llmResponse)

// Render in your UI framework
parts.forEach(part => {
  if (part.type === 'icon') {
    console.log(`Render icon: ${part.iconName}`) // "smile", "check-circle"
  } else {
    console.log(`Render text: ${part.content}`)
  }
})
```

### Convert Emojis to Lucide Icons

```typescript
import { sanitizeEmojis } from '@yourusername/lucide-emoji'

const text = "Hello! 👋 Check this out ✅"

// Get component tags
const result = sanitizeEmojis(text, { format: 'component' })
// "Hello! <Wave /> Check this out <CheckCircle />"

// Get Lucide tags
const result2 = sanitizeEmojis(text, { format: 'lucide-tag' })
// "Hello! <lucide:wave /> Check this out <lucide:check-circle />"
```

## 📖 API Reference

### `parseLucideTags(text: string): ParsedContent[]`

Parse text containing Lucide tags into structured parts.

**Supported tag formats:**
- `<smile/>` - lowercase
- `<Smile/>` - PascalCase
- `<clock-icon/>` - kebab-case with suffix
- `<HeartIcon/>` - PascalCase with suffix

**Returns:**
```typescript
type ParsedContent = {
  type: 'text' | 'icon'
  content: string
  iconName?: string // Lucide icon name (e.g., "smile", "check-circle")
}
```

### `sanitizeEmojis(text: string, options?: SanitizeOptions): string`

Replace emojis with Lucide icon tags.

**Options:**
```typescript
interface SanitizeOptions {
  format?: 'component' | 'lucide-tag' | 'data-lucide'
  keepUnmapped?: boolean // Keep emojis without Lucide equivalent
  className?: string      // Custom class for icons
  size?: number          // Icon size (for data-lucide format)
}
```

**Examples:**
```typescript
// Component format (default)
sanitizeEmojis("Hello 👋", { format: 'component' })
// "Hello <Wave />"

// Lucide tag format
sanitizeEmojis("Hello 👋", { format: 'lucide-tag' })
// "Hello <lucide:wave />"

// Data attribute format
sanitizeEmojis("Hello 👋", { format: 'data-lucide', size: 20 })
// "Hello <i data-lucide="wave" width="20" height="20"></i>"
```

### `getLucideFromEmoji(emoji: string): string | null`

Get Lucide icon name for a specific emoji.

```typescript
getLucideFromEmoji('⏰') // "alarm-clock"
getLucideFromEmoji('✅') // "check-circle"
getLucideFromEmoji('🚀') // "rocket"
```

### `hasLucideEquivalent(emoji: string): boolean`

Check if an emoji has a Lucide equivalent.

```typescript
hasLucideEquivalent('⏰') // true
hasLucideEquivalent('🦄') // false
```

### `getEmojiStats(text: string)`

Get statistics about emoji usage.

```typescript
const stats = getEmojiStats("Hello 👋 World ✅ 🦄")
// {
//   total: 3,
//   mapped: 2,
//   unmapped: 1,
//   mappedEmojis: ['👋', '✅'],
//   unmappedEmojis: ['🦄']
// }
```

### `emojiToLucide: Record<string, string>`

Direct access to the emoji → Lucide mapping (300+ emojis).

```typescript
import { emojiToLucide } from '@yourusername/lucide-emoji'

console.log(emojiToLucide['⏰']) // "alarm-clock"
console.log(emojiToLucide['✅']) // "check-circle"
```

## 🎯 Use Cases

### 1. AI Chat UI

```typescript
import { parseLucideTags } from '@yourusername/lucide-emoji'

function renderMessage(llmResponse: string) {
  const parts = parseLucideTags(llmResponse)

  return parts.map(part => {
    if (part.type === 'icon') {
      return `<lucide-icon name="${part.iconName}" />`
    }
    return part.content
  }).join('')
}
```

### 2. Markdown Processor

```typescript
import { sanitizeEmojis } from '@yourusername/lucide-emoji'

function processMarkdown(markdown: string) {
  // Convert emojis to icons before rendering
  return sanitizeEmojis(markdown, {
    format: 'component',
    keepUnmapped: true
  })
}
```

### 3. Prompt Engineering

Instruct your LLM to use Lucide tags:

```
System: When including icons, use format: <icon-name/>
Examples: <play/>, <check-circle/>, <alert-triangle/>

User: Show me the status
AI: Task 1 <check-circle/> Complete
    Task 2 <clock/> In Progress
    Task 3 <alert-triangle/> Blocked
```

## 📊 Supported Emojis

**300+ emojis mapped** including:

- ⏰ Time & Calendar (clock, calendar, timer)
- ✅ Status (check, x, warning, ban)
- ➡️ Arrows & Directions (up, down, left, right, refresh)
- 📄 Files & Documents (file, folder, clipboard)
- 📧 Communication (mail, message, phone, bell)
- ▶️ Media Controls (play, pause, skip, volume)
- 🔍 Objects & Tools (search, lock, key, settings)
- ☀️ Weather & Nature (sun, moon, cloud, rain)
- ❤️ Symbols (heart, star, lightning)
- 💻 Technology (laptop, monitor, keyboard)
- 🚗 Transport (car, plane, rocket)

## 🔧 Framework Integration

### React

```tsx
import { parseLucideTags } from '@yourusername/lucide-emoji'
import { icons } from 'lucide-react'

function LucideText({ text }: { text: string }) {
  const parts = parseLucideTags(text)

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'icon' && part.iconName) {
          const Icon = icons[toPascalCase(part.iconName)]
          return Icon ? <Icon key={i} size={16} /> : null
        }
        return <span key={i}>{part.content}</span>
      })}
    </>
  )
}
```

### Svelte

```svelte
<script lang="ts">
  import { parseLucideTags } from '@yourusername/lucide-emoji'
  import Icon from '@iconify/svelte'

  let { text } = $props()
  const parts = $derived(parseLucideTags(text))
</script>

{#each parts as part}
  {#if part.type === 'icon' && part.iconName}
    <Icon icon="lucide:{part.iconName}" width={16} />
  {:else}
    {part.content}
  {/if}
{/each}
```

### Vue

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { parseLucideTags } from '@yourusername/lucide-emoji'
import { icons } from 'lucide-vue-next'

const props = defineProps<{ text: string }>()
const parts = computed(() => parseLucideTags(props.text))
</script>

<template>
  <span v-for="(part, i) in parts" :key="i">
    <component
      v-if="part.type === 'icon' && part.iconName"
      :is="icons[toPascalCase(part.iconName)]"
      :size="16"
    />
    <span v-else>{{ part.content }}</span>
  </span>
</template>
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🔗 Links

- [Lucide Icons](https://lucide.dev/)
- [GitHub Repository](https://github.com/yourusername/lucide-emoji)
- [Issues](https://github.com/yourusername/lucide-emoji/issues)
