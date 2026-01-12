<script lang="ts">
  import { onMount } from 'svelte'

  interface Props {
    name: string
    class?: string
    size?: number
  }

  let { name, class: className = '', size = 18 }: Props = $props()

  // Lucide icons as SVG paths (fetched from iconify JSON)
  let iconData: { body: string; width?: number; height?: number } | null = $state(null)
  let loading = $state(true)
  let error = $state(false)

  // In-memory cache for loaded icons (session only)
  const iconCache = new Map<string, { body: string; width?: number; height?: number }>()

  // Persistent cache key prefix
  const CACHE_PREFIX = 'lucide-icon-'
  const CACHE_VERSION = 'v1'
  const CACHE_EXPIRY_DAYS = 7

  // Icon aliases - map common names to actual Lucide icon names
  const iconAliases: Record<string, string> = {
    'wave': 'hand',           // waving hand gesture
    'waving': 'hand',
    'waving-hand': 'hand',
    'hand-wave': 'hand'
  }

  async function loadIcon(iconName: string) {
    // Check for alias
    const actualIconName = iconAliases[iconName] || iconName

    // Check in-memory cache first (fastest) - use actual name
    if (iconCache.has(actualIconName)) {
      iconData = iconCache.get(actualIconName)!
      loading = false
      return
    }

    // Check localStorage cache (persistent) - use actual name
    try {
      const cacheKey = `${CACHE_PREFIX}${CACHE_VERSION}-${actualIconName}`
      const cached = localStorage.getItem(cacheKey)

      if (cached) {
        const cachedData = JSON.parse(cached)
        const now = Date.now()

        // Check if cache is still valid (7 days)
        if (cachedData.timestamp && (now - cachedData.timestamp) < CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
          const icon = {
            body: cachedData.body,
            width: cachedData.width || 24,
            height: cachedData.height || 24
          }

          iconCache.set(actualIconName, icon)
          iconData = icon
          loading = false
          return
        } else {
          // Cache expired, remove it
          localStorage.removeItem(cacheKey)
        }
      }
    } catch (e) {
      // localStorage might be disabled, continue to fetch
      console.warn('localStorage unavailable for icon cache')
    }

    try {
      // Fetch icon data from Iconify API - correct format - use actual name
      const response = await fetch(`https://api.iconify.design/lucide.json?icons=${actualIconName}`)

      if (!response.ok) {
        error = true
        loading = false
        return
      }

      const data = await response.json()

      if (data && data.icons && data.icons[actualIconName]) {
        const iconInfo = data.icons[actualIconName]
        const icon = {
          body: iconInfo.body,
          width: data.width || 24,
          height: data.height || 24
        }

        // Save to in-memory cache (use actual name)
        iconCache.set(actualIconName, icon)
        iconData = icon

        // Save to localStorage for persistence (async, non-blocking) - use actual name
        try {
          const cacheKey = `${CACHE_PREFIX}${CACHE_VERSION}-${actualIconName}`
          const cacheData = {
            body: icon.body,
            width: icon.width,
            height: icon.height,
            timestamp: Date.now()
          }
          localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        } catch (e) {
          // localStorage might be full or disabled, ignore
          console.warn('Failed to cache icon to localStorage:', actualIconName)
        }
      } else {
        error = true
      }
    } catch (e) {
      console.warn(`Failed to load icon: ${iconName} (actual: ${actualIconName})`, e)
      error = true
    } finally {
      loading = false
    }
  }

  $effect(() => {
    loading = true
    error = false
    iconData = null
    loadIcon(name)
  })
</script>

{#if loading}
  <span class="inline-block" style="width: {size}px; height: {size}px;"></span>
{:else if error || !iconData}
  <span class="inline-block text-gray-400" title="Icon not found: {name}" style="width: {size}px; height: {size}px;">⚠️</span>
{:else}
  <svg
    class="inline-block align-text-bottom {className}"
    width={size}
    height={size}
    viewBox="0 0 {iconData.width || 24} {iconData.height || 24}"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {@html iconData.body}
  </svg>
{/if}
