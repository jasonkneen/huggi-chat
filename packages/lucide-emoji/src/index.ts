/**
 * Lucide Emoji Package
 * Convert Unicode emojis to Lucide icons and parse LLM-generated Lucide tags
 */

export {
  emojiToLucide,
  getLucideFromEmoji,
  hasLucideEquivalent
} from './emoji-to-lucide.js'

export {
  sanitizeEmojis,
  parseLucideTags,
  extractEmojis,
  getEmojiStats,
  type SanitizeOptions,
  type ParsedContent
} from './emoji-sanitizer.js'
