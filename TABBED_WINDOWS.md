# Tabbed Windows in ChatUI Electron

Native macOS-style tabbed windows for running multiple chat sessions in one window.

## Features

✨ **Native macOS Tabbing**

- Multiple chat sessions as tabs in one window
- Native macOS tab bar and controls
- Seamless tab switching with keyboard shortcuts
- Drag tabs between windows
- Merge all windows into one tabbed interface

🎯 **Tab Management**

- Create new tabs with `Cmd+T`
- Switch tabs with `Ctrl+Tab` / `Ctrl+Shift+Tab`
- Move tabs to new windows
- Merge all windows into tabs
- Each tab maintains independent state

## Usage

### Creating New Tabs

**Keyboard Shortcut:**

```
Cmd+T  (or Ctrl+T on Windows/Linux)
```

**Menu:**

```
File → New Tab
```

**What happens:** A new ChatUI instance opens as a tab in the current window.

### Switching Between Tabs

**Next Tab:**

```
Ctrl+Tab
```

**Previous Tab:**

```
Ctrl+Shift+Tab
```

**Menu:**

```
Window → Show Next Tab
Window → Show Previous Tab
```

### Moving Tabs

**Move Tab to New Window:**

1. `Window → Move Tab to New Window`
2. Or drag the tab out of the tab bar

**Merge All Windows:**

1. `Window → Merge All Windows`
2. All separate windows combine into one tabbed window

### Drag & Drop

You can **drag tabs** to:

- Reorder within the same window
- Move to another window
- Create a new window (drag out of tab bar)

## Tab Behavior

### Independent State

Each tab maintains its own:

- Chat conversation history
- Model selection
- Settings (except appearance settings which are global)
- Input state

### Shared Settings

Settings shared across all tabs:

- **Appearance** (vibrancy, opacity, blur, saturation)
- **API configuration** (tokens, base URL)
- **User preferences**

When you change appearance settings in one tab, it applies to **all tabs and windows** immediately.

### Tab Persistence

- Tabs are **not persisted** across app restarts
- Each new launch starts with one clean tab
- Use browser bookmarks or session managers if you need to restore multiple conversations

## Keyboard Shortcuts Reference

| Action       | macOS            | Windows/Linux    |
| ------------ | ---------------- | ---------------- |
| New Tab      | `Cmd+T`          | `Ctrl+T`         |
| Next Tab     | `Ctrl+Tab`       | `Ctrl+Tab`       |
| Previous Tab | `Ctrl+Shift+Tab` | `Ctrl+Shift+Tab` |
| Close Tab    | `Cmd+W`          | `Ctrl+W`         |
| New Window   | `Cmd+N`          | `Ctrl+N`         |

## Menu Reference

### File Menu

- **New Tab** (`Cmd+T`) - Create a new chat tab
- **Close** (`Cmd+W`) - Close current tab/window

### Window Menu

- **Minimize** - Minimize window
- **Zoom** - Maximize/restore window
- **Show Previous Tab** (`Ctrl+Shift+Tab`)
- **Show Next Tab** (`Ctrl+Tab`)
- **Move Tab to New Window** - Extract current tab to separate window
- **Merge All Windows** - Combine all windows into one tabbed window
- **Bring All to Front** - macOS window management

## Examples

### Multi-Task Workflow

**Scenario:** You want to chat with different models simultaneously.

1. **Start with default model** in first tab
2. **Press `Cmd+T`** to create second tab
3. **Switch to a different model** in second tab
4. **Press `Cmd+T`** again for third tab with another model
5. **Use `Ctrl+Tab`** to cycle through your chats

Each tab maintains its own conversation independently.

### Research Mode

**Scenario:** Comparing responses from multiple models.

1. **Create 3 tabs** (`Cmd+T` × 3)
2. **Set each tab to a different model**:
   - Tab 1: GPT-4
   - Tab 2: Claude Opus
   - Tab 3: Llama
3. **Ask the same question in each tab**
4. **Switch between tabs** to compare responses

### Window Organization

**Scenario:** You have 5 separate ChatUI windows open.

1. **Window → Merge All Windows**
2. All 5 windows become tabs in one window
3. **Use `Ctrl+Tab`** to navigate between them
4. **Drag tabs** to reorder by priority

## Technical Details

### Tab Grouping

All ChatUI windows share the same **tabbing identifier**: `chatui-tab-group`

This means:

- Any ChatUI window can accept tabs from other ChatUI windows
- Windows automatically group when merged
- You cannot tab ChatUI windows with other applications

### Tab Bar Appearance

The native macOS tab bar appears:

- At the top of the window (below title bar area)
- Shows tab titles (currently "ChatUI" for all tabs)
- Has + button for new tabs
- Has close buttons (x) for each tab

### Performance

- Each tab runs in the **same process**
- All tabs share the **same Vite dev server connection** (in development)
- Settings changes propagate instantly across all tabs
- Appearance changes apply to all tabs simultaneously

## Platform Support

| Feature        | macOS     | Windows         | Linux           |
| -------------- | --------- | --------------- | --------------- |
| Native Tab Bar | ✅ Full   | ❌ No           | ❌ No           |
| Cmd+T New Tab  | ✅ Yes    | ✅ Yes (Ctrl+T) | ✅ Yes (Ctrl+T) |
| Tab Switching  | ✅ Native | ⚠️ Menu only    | ⚠️ Menu only    |
| Drag Tabs      | ✅ Yes    | ❌ No           | ❌ No           |
| Merge Windows  | ✅ Yes    | ❌ No           | ❌ No           |

**Note:** Windows and Linux can create multiple windows via `Cmd/Ctrl+T`, but they won't appear as tabs in the same window. The menu shortcuts still work.

## Troubleshooting

### Tabs not appearing

**Check:**

- You're on macOS (tabs are macOS-only feature)
- macOS version is 10.12 Sierra or later
- System Preferences → Desktop & Dock → "Prefer tabs when opening documents" is not set to "Never"

### Can't drag tabs

**Solutions:**

- Ensure you're dragging from the tab itself, not the window title
- Check that the tab bar is visible (should be below title area)
- Try right-clicking tab and selecting "Move Tab to New Window"

### New tab opens as separate window

**Possible causes:**

- System setting prevents tabbing
- Go to System Preferences → Desktop & Dock → Set "Prefer tabs" to "Always" or "In Full Screen Only"

### Tabs disappear on restart

**This is expected behavior.** Tabs are not persisted between app launches. Each restart begins with one clean tab.

## Related Files

- `electron-main.cjs` - Main process with tab logic
- `electron-preload.cjs` - IPC bridge (unchanged for tabs)
- `ElectronWindowControls.svelte` - Window controls (unchanged)
- `ElectronAppearanceSettings.svelte` - Settings that affect all tabs

## See Also

- [ELECTRON_README.md](./ELECTRON_README.md) - Main Electron documentation
- [APPEARANCE_SETTINGS.md](./APPEARANCE_SETTINGS.md) - Appearance customization
- [Apple Tabbing Documentation](https://developer.apple.com/documentation/appkit/nswindow/1644704-tabbingidentifier)
