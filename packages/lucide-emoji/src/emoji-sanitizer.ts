import { emojiToLucide } from './emoji-to-lucide.js'

export interface SanitizeOptions {
  /**
   * Format of the output
   * - 'component': <IconName />
   * - 'lucide-tag': <lucide:icon-name />
   * - 'data-lucide': <i data-lucide="icon-name"></i>
   */
  format?: 'component' | 'lucide-tag' | 'data-lucide'

  /**
   * Keep emoji if no Lucide equivalent exists
   */
  keepUnmapped?: boolean

  /**
   * Custom class name for icons
   */
  className?: string

  /**
   * Icon size (for data-lucide format)
   */
  size?: number
}

/**
 * Replace emojis in text with Lucide icon tags
 */
export function sanitizeEmojis(text: string, options: SanitizeOptions = {}): string {
  const {
    format = 'component',
    keepUnmapped = true,
    className = '',
    size = 16
  } = options

  // Regex to match emoji characters
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu

  return text.replace(emojiRegex, (emoji) => {
    const lucideName = emojiToLucide[emoji]

    if (!lucideName) {
      return keepUnmapped ? emoji : ''
    }

    switch (format) {
      case 'component':
        const componentName = lucideName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('')
        return `<${componentName}${className ? ` class="${className}"` : ''} />`

      case 'lucide-tag':
        return `<lucide:${lucideName}${className ? ` class="${className}"` : ''} />`

      case 'data-lucide':
        return `<i data-lucide="${lucideName}"${className ? ` class="${className}"` : ''}${size ? ` width="${size}" height="${size}"` : ''}></i>`

      default:
        return emoji
    }
  })
}

/**
 * Parse Lucide tags from LLM output (e.g., <smile/>, <Clock/>, <heart-icon/>)
 * and convert to a structured format for rendering
 */
export type ParsedContent =
  | { type: 'text'; content: string }
  | { type: 'icon'; content: string; iconName: string }

export function parseLucideTags(text: string): ParsedContent[] {
  const parts: ParsedContent[] = []

  // Match self-closing tags: <TagName/> or <tag-name/>
  const tagRegex = /<([A-Za-z][A-Za-z0-9-]*)\s*\/>/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(text)) !== null) {
    // Add text before the tag
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      })
    }

    // Add the icon
    const tagName = match[1]
    const iconName = convertTagToLucideName(tagName)

    parts.push({
      type: 'icon',
      content: match[0],
      iconName
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    })
  }

  return parts
}

/**
 * Convert tag name to Lucide icon name
 * Examples:
 * - smile → smile
 * - Clock → clock
 * - HeartIcon → heart
 * - arrow-right → arrow-right
 */
function convertTagToLucideName(tagName: string): string {
  // Remove common suffixes
  let name = tagName.replace(/Icon$/i, '')

  // Convert PascalCase to kebab-case
  name = name.replace(/([A-Z])/g, (_match, letter) => `-${letter.toLowerCase()}`)

  // Remove leading dash
  name = name.replace(/^-/, '')

  // Ensure lowercase
  return name.toLowerCase()
}

/**
 * Extract all emojis from text with their positions
 */
export function extractEmojis(text: string): Array<{ emoji: string; position: number; lucideName: string | null }> {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu
  const emojis: Array<{ emoji: string; position: number; lucideName: string | null }> = []

  let match: RegExpExecArray | null
  while ((match = emojiRegex.exec(text)) !== null) {
    emojis.push({
      emoji: match[0],
      position: match.index,
      lucideName: emojiToLucide[match[0]] || null
    })
  }

  return emojis
}

/**
 * Get statistics about emoji usage in text
 */
export function getEmojiStats(text: string): {
  total: number
  mapped: number
  unmapped: number
  mappedEmojis: string[]
  unmappedEmojis: string[]
} {
  const extracted = extractEmojis(text)
  const mapped = extracted.filter(e => e.lucideName !== null)
  const unmapped = extracted.filter(e => e.lucideName === null)

  return {
    total: extracted.length,
    mapped: mapped.length,
    unmapped: unmapped.length,
    mappedEmojis: [...new Set(mapped.map(e => e.emoji))],
    unmappedEmojis: [...new Set(unmapped.map(e => e.emoji))]
  }
}
