# Emoji to Lucide Icon System

This system allows you to:
1. Replace emojis in text with Lucide icon tags
2. Parse LLM-generated Lucide tags (like `<smile/>`) and render them as real icons
3. Get a comprehensive mapping of Unicode emojis to Lucide icons

## Quick Start

### 1. Render LLM Output with Lucide Tags

The simplest use case - your LLM outputs tags like `<smile/>` or `<Clock/>`:

```svelte
<script>
  import LucideText from '$lib/components/LucideText.svelte'

  const llmResponse = "Here's a smile face for you: <smile/> And the time: <Clock/>"
</script>

<LucideText text={llmResponse} iconSize={20} />
```

**Supported tag formats:**
- `<smile/>` - lowercase
- `<Smile/>` - PascalCase
- `<clock-icon/>` - kebab-case with suffix
- `<HeartIcon/>` - PascalCase with suffix

All convert to the correct Lucide icon name.

### 2. Convert Emojis to Lucide Icons

Replace emojis in existing text:

```typescript
import { sanitizeEmojis } from '$lib/utils/emoji-sanitizer'

const text = "Hello! 👋 Check this out ✅"

// Option 1: Component format
const result = sanitizeEmojis(text, { format: 'component' })
// "Hello! <Wave /> Check this out <CheckCircle />"

// Option 2: Lucide tag format
const result2 = sanitizeEmojis(text, { format: 'lucide-tag' })
// "Hello! <lucide:wave /> Check this out <lucide:check-circle />"

// Option 3: Data attribute format (for vanilla JS)
const result3 = sanitizeEmojis(text, { format: 'data-lucide', size: 20 })
// "Hello! <i data-lucide="wave" width="20" height="20"></i>"
```

### 3. Parse Tags Manually

For more control:

```typescript
import { parseLucideTags } from '$lib/utils/emoji-sanitizer'

const text = "Click the <play/> button to start"
const parts = parseLucideTags(text)

parts.forEach(part => {
  if (part.type === 'icon') {
    console.log(`Icon: ${part.iconName}`) // "play"
  } else {
    console.log(`Text: ${part.content}`)
  }
})
```

## Prompting Models to Output Lucide Tags

### System Prompt Example

```
When you want to include icons in your responses, use Lucide icon tags instead of emojis.

Format: <icon-name/>

Examples:
- "Click the <play/> button"
- "Task complete <check-circle/>"
- "Warning <alert-triangle/> detected"

Available icons include: clock, heart, star, smile, check, x, alert-triangle,
arrow-right, arrow-left, search, settings, user, home, calendar, and 200+ more.

Use descriptive names - they'll be automatically converted to the correct Lucide icon.
```

### User Message Example

```
User: "Show me the status of my tasks"