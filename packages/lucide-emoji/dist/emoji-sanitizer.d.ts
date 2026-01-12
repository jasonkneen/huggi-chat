export interface SanitizeOptions {
    /**
     * Format of the output
     * - 'component': <IconName />
     * - 'lucide-tag': <lucide:icon-name />
     * - 'data-lucide': <i data-lucide="icon-name"></i>
     */
    format?: 'component' | 'lucide-tag' | 'data-lucide';
    /**
     * Keep emoji if no Lucide equivalent exists
     */
    keepUnmapped?: boolean;
    /**
     * Custom class name for icons
     */
    className?: string;
    /**
     * Icon size (for data-lucide format)
     */
    size?: number;
}
/**
 * Replace emojis in text with Lucide icon tags
 */
export declare function sanitizeEmojis(text: string, options?: SanitizeOptions): string;
/**
 * Parse Lucide tags from LLM output (e.g., <smile/>, <Clock/>, <heart-icon/>)
 * and convert to a structured format for rendering
 */
export interface ParsedContent {
    type: 'text' | 'icon';
    content: string;
    iconName?: string;
}
export declare function parseLucideTags(text: string): ParsedContent[];
/**
 * Extract all emojis from text with their positions
 */
export declare function extractEmojis(text: string): Array<{
    emoji: string;
    position: number;
    lucideName: string | null;
}>;
/**
 * Get statistics about emoji usage in text
 */
export declare function getEmojiStats(text: string): {
    total: number;
    mapped: number;
    unmapped: number;
    mappedEmojis: string[];
    unmappedEmojis: string[];
};
//# sourceMappingURL=emoji-sanitizer.d.ts.map