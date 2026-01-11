# Electron Appearance Settings

Complete guide to customizing ChatUI's transparency, blur, and glass effects in real-time.

## Features

🎨 **Visual Customization**
- Vibrancy effect modes (19 options on macOS)
- Window opacity (10% - 100%)
- Blur intensity (0px - 100px)
- Color saturation (100% - 300%)
- Live preview of all changes
- Settings persist across app restarts

## Usage

### Add to Your App

Import and use the settings component anywhere in your app:

```svelte
<script>
  import ElectronAppearanceSettings from '$lib/components/ElectronAppearanceSettings.svelte'
</script>

<ElectronAppearanceSettings />
```

**Recommended placement:**
- Settings page/modal
- Sidebar drawer
- Preferences panel

### Component Only Shows in Electron

The component automatically:
- Detects if running in Electron
- Only renders when inside the Electron wrapper
- Hides vibrancy options on non-macOS platforms

## Settings Reference

### 1. Vibrancy Effect (macOS only)

Controls the native macOS window blurring effect behind the app content.

**Available modes:**
- `appearance-based` - Adapts to system light/dark mode
- `light` - Light vibrancy
- `dark` - Dark vibrancy
- `titlebar` - Title bar style
- `selection` - Selection style
- `menu` - Menu style
- `popover` - Popover style
- `sidebar` - Sidebar style
- `medium-light` - Medium light effect
- `ultra-dark` - Ultra dark effect (default)
- `header` - Header style
- `sheet` - Sheet style
- `window` - Window style
- `hud` - HUD style
- `fullscreen-ui` - Fullscreen UI style ⭐ **Recommended**
- `tooltip` - Tooltip style
- `content` - Content style
- `under-window` - Under window effect
- `under-page` - Under page effect

**Recommendation:** Start with `fullscreen-ui` for the best liquid glass effect.

### 2. Window Opacity

Controls overall window transparency.

- **Range:** 10% - 100%
- **Default:** 100%
- **Use case:** Reduce for subtle desktop background bleed-through

**Tip:** Use 85-95% for elegant semi-transparency without sacrificing readability.

### 3. Blur Intensity

Controls the backdrop blur strength applied to the window background.

- **Range:** 0px - 100px
- **Default:** 40px
- **Use case:** Higher blur creates stronger glass effect, lower blur shows more detail behind

**Recommendations:**
- **Subtle glass:** 20-30px
- **Standard glass:** 40-50px (default)
- **Strong glass:** 60-80px
- **Extreme glass:** 90-100px

### 4. Color Saturation

Controls color vibrancy in the blurred background.

- **Range:** 100% - 300%
- **Default:** 180%
- **Use case:** Higher saturation creates more vivid, colorful glass

**Recommendations:**
- **Muted:** 100-130%
- **Natural:** 140-170%
- **Vibrant:** 180-220% (default)
- **Ultra vibrant:** 230-300%

## Presets

Try these preset combinations for different effects:

### Minimal Glass
```
Vibrancy: window
Opacity: 95%
Blur: 25px
Saturation: 120%
```

### Classic Frosted Glass
```
Vibrancy: fullscreen-ui
Opacity: 100%
Blur: 40px
Saturation: 180%
```

### Ultra Transparent
```
Vibrancy: ultra-dark
Opacity: 75%
Blur: 60px
Saturation: 200%
```

### Liquid Glass (iOS 26 Style)
```
Vibrancy: fullscreen-ui
Opacity: 90%
Blur: 50px
Saturation: 220%
```

### Subtle Professional
```
Vibrancy: sidebar
Opacity: 98%
Blur: 30px
Saturation: 140%
```

## Settings Storage

Settings are automatically saved to:
```
~/Library/Application Support/chat-ui/appearance-settings.json
```

Format:
```json
{
  "vibrancy": "fullscreen-ui",
  "opacity": 1.0,
  "blur": 40,
  "saturation": 180
}
```

You can manually edit this file if needed (app restart required).

## API Reference

### Electron API Methods

Available via `window.electronAPI`:

```typescript
// Set vibrancy mode (macOS only)
electronAPI.setVibrancy(type: string): Promise<{ success: boolean, error?: string }>

// Set window opacity
electronAPI.setOpacity(opacity: number): Promise<{ success: boolean, opacity: number }>

// Set blur and saturation
electronAPI.setBlur({ blur?: number, saturation?: number }): Promise<{ success: boolean, settings: object }>

// Get current settings
electronAPI.getAppearanceSettings(): Promise<{
  vibrancy: string,
  opacity: number,
  blur: number,
  saturation: number
}>
```

### Example: Custom Integration

```svelte
<script>
  import { onMount } from 'svelte'

  let currentSettings

  onMount(async () => {
    if (window.electronAPI) {
      // Load current settings
      currentSettings = await window.electronAPI.getAppearanceSettings()

      // Set specific values
      await window.electronAPI.setBlur({ blur: 60, saturation: 200 })
      await window.electronAPI.setOpacity(0.85)
      await window.electronAPI.setVibrancy('fullscreen-ui')
    }
  })
</script>
```

## Platform Support

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Vibrancy | ✅ Full | ❌ N/A | ❌ N/A |
| Opacity | ✅ Full | ✅ Full | ✅ Full |
| Blur | ✅ Native + CSS | ✅ CSS only | ✅ CSS only |
| Saturation | ✅ Yes | ✅ Yes | ✅ Yes |

**Note:** On Windows/Linux, blur is achieved via CSS `backdrop-filter` which may have limited compositor support.

## Troubleshooting

### Settings not saving
**Solution:** Check file permissions for `~/Library/Application Support/chat-ui/`

### Vibrancy not working
**Solution:** Ensure you're on macOS and the window has `transparent: true`

### Blur looks pixelated
**Solution:** Reduce blur intensity or increase saturation for smoother appearance

### Performance issues
**Solution:** High blur (80-100px) can be GPU-intensive. Reduce to 40-60px range.

### Settings reset on restart
**Solution:** Check console for file write errors. Ensure app has disk access permissions.

## Best Practices

1. **Start conservative** - Begin with default values and adjust gradually
2. **Test both modes** - Check light and dark mode with your settings
3. **Consider content** - Text-heavy UIs benefit from less blur
4. **Match platform** - Use platform-appropriate vibrancy modes
5. **Performance first** - Lower blur if experiencing lag

## Tips

💡 **For best readability:** Keep opacity above 85% and blur below 60px

💡 **For maximum glass effect:** Combine high blur (70-80px) with high saturation (220-250%)

💡 **For professional look:** Use `sidebar` or `window` vibrancy with moderate settings

💡 **For iOS 26 style:** `fullscreen-ui` vibrancy + 50px blur + 220% saturation

## Related Files

- `electron-main.cjs` - Main process settings handlers
- `electron-preload.cjs` - IPC bridge
- `src/lib/components/ElectronAppearanceSettings.svelte` - Settings UI component
- `ElectronWindowControls.svelte` - Window controls component

## See Also

- [ELECTRON_README.md](./ELECTRON_README.md) - Main Electron documentation
- [Apple Vibrancy Documentation](https://developer.apple.com/documentation/appkit/nsvisualeffectview)
