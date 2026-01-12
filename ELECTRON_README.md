# ChatUI Electron App

Modern Electron wrapper for ChatUI with **transparency**, **vibrancy**, and **liquid glass effects**.

## Features

✨ **Visual Effects**

- Transparent frameless window
- macOS vibrancy (ultra-dark, fullscreen-ui modes)
- Backdrop blur with liquid glass aesthetics
- Dark mode support
- Native macOS window shadows and rounded corners

🎨 **UI Enhancements**

- Custom window controls (minimize, maximize, close)
- Draggable title bar
- Glass panel styling
- iOS 26-compatible transparency effects

## Quick Start

### Development Mode

1. **Start the Vite dev server** (in one terminal):

   ```bash
   npm run dev
   ```

2. **Launch Electron** (in another terminal):
   ```bash
   npm run electron:dev
   ```

The Electron app will connect to the Vite dev server at `http://localhost:5174`.

### Production Build

Build the complete Electron app:

```bash
npm run electron:build
```

This will:

1. Build the SvelteKit app with Vite
2. Package it as an Electron app with electron-builder
3. Output to `dist/` directory

## Window Controls

The app includes a custom title bar with window controls. To add it to your UI:

```svelte
<script>
	import ElectronWindowControls from "$lib/components/ElectronWindowControls.svelte";
</script>

<ElectronWindowControls />
```

The component will automatically detect if running in Electron and only render in that environment.

## Glass Effect Styling

The Electron wrapper automatically injects glass effect CSS. You can enhance specific elements:

```html
<div class="glass-panel">
	<!-- Your content with glass effect -->
</div>
```

CSS classes injected by Electron:

- `glass-panel` - Glass effect panel
- Window background has automatic backdrop blur
- Dark mode variants included

## Configuration

### Window Properties (electron-main.cjs)

Key window options:

- `transparent: true` - Enable transparency
- `frame: false` - Frameless window
- `vibrancy: 'ultra-dark'` - macOS vibrancy effect
- `backgroundColor: '#00000000'` - Fully transparent background

### Available Vibrancy Modes (macOS)

- `appearance-based`
- `light`
- `dark`
- `titlebar`
- `selection`
- `menu`
- `popover`
- `sidebar`
- `medium-light`
- `ultra-dark`
- `header`
- `sheet`
- `window`
- `hud`
- `fullscreen-ui`
- `tooltip`
- `content`
- `under-window`
- `under-page`

Change in `electron-main.cjs`:

```javascript
vibrancy: "fullscreen-ui"; // or any mode above
```

## Platform Support

### macOS

✅ Full transparency and vibrancy support
✅ Native blur effects
✅ Dark mode with system preferences

### Windows

✅ Transparency support
✅ Acrylic-like effects via backdrop-filter
⚠️ No native vibrancy (uses CSS blur)

### Linux

✅ Transparency support
⚠️ Effects depend on compositor

## Troubleshooting

### App window is blank

- Ensure Vite dev server is running on port 5174
- Check console for errors

### Transparency not working

- macOS: Ensure window compositing is enabled
- Windows: Update to Windows 10 1803+ for better transparency
- Linux: Use a compositor (picom, compton)

### DevTools autofill errors

Harmless warnings, can be ignored. Related to Electron DevTools protocol.

## Scripts Reference

```bash
# Development
npm run dev                # Start Vite dev server
npm run electron:dev      # Launch Electron in dev mode
npm run electron:start    # Launch Electron (production mode)

# Production
npm run build             # Build SvelteKit app
npm run electron:build    # Build complete Electron app

# Preview
npm run preview           # Preview production build (web)
```

## Architecture

```
chat-ui/
├── electron-main.cjs          # Electron main process
├── electron-preload.cjs       # Preload script (IPC bridge)
├── entitlements.mac.plist     # macOS security entitlements
├── src/lib/components/
│   └── ElectronWindowControls.svelte  # Custom window controls
└── build/                     # Vite build output (production)
```

## Security

The Electron app follows security best practices:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Preload script for safe IPC
- CSP headers (via SvelteKit)

## Customization

### Change vibrancy effect:

Edit `electron-main.cjs`:

```javascript
mainWindow.setVibrancy("fullscreen-ui");
```

### Adjust blur intensity:

Edit the CSS injection in `electron-main.cjs`:

```javascript
backdrop-filter: blur(40px) saturate(180%);
```

### Custom window size:

```javascript
width: Math.floor(width * 0.8),  // 80% of screen width
height: Math.floor(height * 0.8), // 80% of screen height
```

## Credits

Built with:

- [Electron](https://www.electronjs.org/) - Desktop app framework
- [SvelteKit](https://kit.svelte.dev/) - Web framework
- [Vite](https://vitejs.dev/) - Build tool
- [electron-builder](https://www.electron.build/) - App packager
