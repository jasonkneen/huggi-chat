const { app, screen, Menu, dialog, BrowserWindow: ElectronBrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Platform-specific vibrancy handling
// electron-acrylic-window is Windows-only (has win32-displayconfig native module)
// macOS uses built-in Electron vibrancy
let BrowserWindow = ElectronBrowserWindow;
let setVibrancy = null;

if (process.platform === "win32") {
	try {
		const acrylicWindow = require("electron-acrylic-window");
		BrowserWindow = acrylicWindow.BrowserWindow;
		setVibrancy = acrylicWindow.setVibrancy;
	} catch (e) {
		console.log("electron-acrylic-window not available, using standard BrowserWindow");
	}
}

// Track all windows
let windows = new Set();

// Appearance settings with defaults
let appearanceSettings = {
	// electron-acrylic-window vibrancy settings (Windows)
	vibrancy: {
		theme: "dark", // 'light', 'dark', or '#rrggbbaa'
		effect: "acrylic", // 'acrylic' or 'blur'
		disableOnBlur: false, // keep effect when window loses focus
	},
	// macOS vibrancy type - uses native setVibrancy() string values
	// Valid: 'light', 'dark', 'sidebar', 'fullscreen-ui', 'header', 'titlebar', 'menu', 'popover', 'under-window', 'hud'
	vibrancyType: "sidebar",
	// Windows 11 native backgroundMaterial (fallback)
	backgroundMaterial: "acrylic",
	opacity: 1.0,
	blur: 40,
	saturation: 180,
};

// Load saved settings
const settingsPath = path.join(app.getPath("userData"), "appearance-settings.json");
try {
	if (fs.existsSync(settingsPath)) {
		appearanceSettings = {
			...appearanceSettings,
			...JSON.parse(fs.readFileSync(settingsPath, "utf8")),
		};
	}
} catch (e) {
	console.log("Could not load appearance settings:", e);
}

// Save settings to disk
function saveSettings() {
	try {
		fs.writeFileSync(settingsPath, JSON.stringify(appearanceSettings, null, 2));
	} catch (e) {
		console.error("Could not save appearance settings:", e);
	}
}

// Apply blur and glass effect settings dynamically
function applyBlurSettings(window) {
	if (!window) return;

	const { blur, saturation } = appearanceSettings;
	const panelBlur = Math.max(10, blur / 2);

	window.webContents.insertCSS(`
    /* Import Source Sans Pro from Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap');

    /* Set Source Sans Pro as default font */
    * {
      font-family: 'Source Sans 3', 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    }

    /* Enable dragging on header area */
    header, .drag-region {
      -webkit-app-region: drag;
    }

    /* Prevent dragging on interactive elements */
    button, a, input, textarea, select {
      -webkit-app-region: no-drag;
    }

    /* Only apply backdrop blur to root element, don't override background colors */
    html {
      backdrop-filter: blur(${blur}px) saturate(${saturation}%);
      -webkit-backdrop-filter: blur(${blur}px) saturate(${saturation}%);
    }

    /* Position grid below traffic lights and tab bar */
    body > div.fixed.grid {
      top: 57px !important;
      height: calc(100vh - 57px) !important;
    }

    /* Reduce gaps in chat messages */
    .flex.flex-col.gap-4 {
      gap: 0.75rem !important;
    }

    /* === VIBRANCY: Only window-level backgrounds, NOT content === */
    
    /* Main window background - transparent for vibrancy */
    html, body {
      background-color: transparent !important;
    }

    /* Main grid container - transparent */
    body > div.fixed.grid {
      background-color: transparent !important;
    }

    /* Navigation sidebar - subtle glass effect */
    nav {
      background-color: rgba(255, 255, 255, 0.85) !important;
    }
    .dark nav {
      background-color: rgba(30, 30, 30, 0.85) !important;
    }

    /* Scrollable content area - transparent to show vibrancy */
    .scrollbar-custom {
      background-color: transparent !important;
    }

    /* === KEEP CONTENT READABLE - solid backgrounds === */
    /* Modals, cards, settings panels stay opaque */

    /* Main content area - let vibrancy show through */
    .dark .scrollbar-custom {
      background-color: transparent !important;
    }

    /* Scrollbar track in dark mode - semi-transparent */
    .dark .scrollbar-custom::-webkit-scrollbar {
      background-color: transparent !important;
    }

    .dark .scrollbar-custom::-webkit-scrollbar-track {
      background-color: transparent !important;
    }
  `);
}

function createWindow() {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	// Determine vibrancy value based on platform
	// macOS uses string type, Windows uses object via electron-acrylic-window
	const vibrancyValue =
		process.platform === "darwin"
			? appearanceSettings.vibrancyType || "fullscreen-ui"
			: appearanceSettings.vibrancy;

	const win = new BrowserWindow({
		width: Math.floor(width * 0.35),
		height: Math.floor(height * 0.5),
		minWidth: 800,
		minHeight: 600,
		frame: false,
		transparent: true,
		titleBarStyle: "customButtonsOnHover",
		trafficLightPosition: { x: 12, y: 17 }, // Traffic lights appear on hover (moved down 5px)
		// Platform-specific vibrancy: string for macOS, object for Windows
		vibrancy: vibrancyValue,
		visualEffectState: "active",
		backgroundColor: "#00000000", // Fully transparent
		hasShadow: true,
		roundedCorners: true,
		tabbingIdentifier: "chatui-tab-group", // Enable native macOS tabs
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			webSecurity: true,
			preload: path.join(__dirname, "electron-preload.cjs"),
		},
	});

	// Add to windows set
	windows.add(win);

	// Apply vibrancy - Windows uses electron-acrylic-window, macOS uses native
	try {
		if (process.platform === "win32" && setVibrancy) {
			setVibrancy(win, appearanceSettings.vibrancy);
		} else if (process.platform === "darwin") {
			// macOS native vibrancy
			win.setVibrancy(appearanceSettings.vibrancyType || "fullscreen-ui");
		}
	} catch (e) {
		console.log("Vibrancy not supported:", e);
	}

	// macOS specific
	if (process.platform === "darwin") {
		// Keep window buttons visible for tab bar (frameless mode compatibility)
		win.setWindowButtonVisibility(true);
		// Show tab bar by default
		win.toggleTabBar();
	}

	// Set window opacity
	win.setOpacity(appearanceSettings.opacity);

	const isDev = process.env.NODE_ENV === "development";

	if (isDev) {
		// Development: connect to Vite dev server
		win.loadURL("http://localhost:5173");
		win.webContents.openDevTools({ mode: "detach" });
	} else {
		// Production: load built files
		win.loadFile(path.join(__dirname, "build", "index.html"));
	}

	win.on("closed", () => {
		windows.delete(win);
	});

	// Handle window dragging for frameless window and apply dynamic CSS
	win.webContents.on("did-finish-load", () => {
		applyBlurSettings(win);
	});

	return win;
}

// Create application menu with tab support
function createMenu() {
	const template = [
		{
			label: app.name,
			submenu: [
				{ role: "about" },
				{ type: "separator" },
				{ role: "services" },
				{ type: "separator" },
				{ role: "hide" },
				{ role: "hideOthers" },
				{ role: "unhide" },
				{ type: "separator" },
				{ role: "quit" },
			],
		},
		{
			label: "File",
			submenu: [
				{
					label: "New Tab",
					accelerator: "CmdOrCtrl+T",
					click: (item, focusedWindow) => {
						if (focusedWindow && process.platform === "darwin") {
							// Create new window as a tab
							const newWin = createWindow();
							focusedWindow.addTabbedWindow(newWin);
						} else {
							createWindow();
						}
					},
				},
				{ type: "separator" },
				{ role: "close" },
			],
		},
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "selectAll" },
			],
		},
		{
			label: "View",
			submenu: [
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "resetZoom" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},
		{
			label: "Window",
			submenu: [
				{ role: "minimize" },
				{ role: "zoom" },
				{ type: "separator" },
				{
					label: "Show Previous Tab",
					accelerator: "Ctrl+Shift+Tab",
					click: (item, focusedWindow) => {
						if (focusedWindow) {
							focusedWindow.selectPreviousTab();
						}
					},
				},
				{
					label: "Show Next Tab",
					accelerator: "Ctrl+Tab",
					click: (item, focusedWindow) => {
						if (focusedWindow) {
							focusedWindow.selectNextTab();
						}
					},
				},
				{
					label: "Move Tab to New Window",
					click: (item, focusedWindow) => {
						if (focusedWindow) {
							focusedWindow.moveTabToNewWindow();
						}
					},
				},
				{
					label: "Merge All Windows",
					click: () => {
						BrowserWindow.getAllWindows().forEach((win, index) => {
							if (index > 0) {
								win.mergeAllWindows();
							}
						});
					},
				},
				{ type: "separator" },
				{ role: "front" },
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
	// macOS: Enable native window tabbing before creating windows
	if (process.platform === "darwin") {
		app.dock.show();
		// Force tabs to always appear in the same window
		app.setUserActivity("NSUserActivityTypeBrowsingWeb", {}, "");
	}

	// Create menu
	createMenu();

	// Create first window
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Handle IPC for window controls (minimize, maximize, close)
const { ipcMain } = require("electron");

ipcMain.handle("window-minimize", (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	win?.minimize();
});

ipcMain.handle("window-maximize", (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win?.isMaximized()) {
		win.unmaximize();
	} else {
		win?.maximize();
	}
});

ipcMain.handle("window-close", (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	win?.close();
});

// Handle IPC for appearance settings
ipcMain.handle("set-vibrancy", (event, options) => {
	try {
		// Map theme names to macOS vibrancy types
		// macOS valid types: 'light', 'dark', 'titlebar', 'selection', 'menu', 'popover', 'sidebar',
		// 'header', 'sheet', 'window', 'hud', 'fullscreen-ui', 'tooltip', 'content', 'under-window', 'under-page'
		let macVibrancyType = "fullscreen-ui";

		if (typeof options === "string") {
			// Direct vibrancy type string
			macVibrancyType = options;
		} else if (options && options.theme) {
			// Map theme to vibrancy type
			if (options.theme === "light") {
				macVibrancyType = "light";
			} else if (options.theme === "dark") {
				macVibrancyType = "dark";
			} else if (options.theme === "sidebar") {
				macVibrancyType = "sidebar";
			} else if (options.theme === "titlebar") {
				macVibrancyType = "titlebar";
			} else {
				macVibrancyType = options.theme;
			}
		}

		appearanceSettings.vibrancy = options;
		appearanceSettings.vibrancyType = macVibrancyType;
		saveSettings();

		// Apply to all windows - platform specific
		windows.forEach((w) => {
			try {
				if (process.platform === "win32" && setVibrancy) {
					setVibrancy(w, options);
				} else if (process.platform === "darwin") {
					console.log("[vibrancy] Setting macOS vibrancy to:", macVibrancyType);
					w.setVibrancy(macVibrancyType);
				}
			} catch (e) {
				console.error("Failed to set vibrancy on window:", e);
			}
		});
		return { success: true, vibrancyType: macVibrancyType };
	} catch (e) {
		console.error("Failed to set vibrancy:", e);
		return { success: false, error: e.message };
	}
});

// Legacy handler for Windows backgroundMaterial (fallback)
ipcMain.handle("set-background-material", (event, material) => {
	// Update vibrancy effect type instead
	try {
		const vibrancyOpts = {
			...appearanceSettings.vibrancy,
			effect: material === "blur" ? "blur" : "acrylic",
		};
		appearanceSettings.vibrancy = vibrancyOpts;
		saveSettings();

		windows.forEach((w) => {
			try {
				if (process.platform === "win32" && setVibrancy) {
					setVibrancy(w, vibrancyOpts);
				} else if (process.platform === "darwin") {
					w.setVibrancy(appearanceSettings.vibrancyType || "fullscreen-ui");
				}
			} catch (e) {
				console.error("Failed to set vibrancy on window:", e);
			}
		});
		return { success: true };
	} catch (e) {
		console.error("Failed to set background material:", e);
		return { success: false, error: e.message };
	}
});

ipcMain.handle("set-opacity", (event, opacity) => {
	const clampedOpacity = Math.max(0.1, Math.min(1.0, opacity));
	appearanceSettings.opacity = clampedOpacity;
	saveSettings();
	// Apply to all windows
	windows.forEach((win) => {
		win.setOpacity(clampedOpacity);
	});
	return { success: true, opacity: clampedOpacity };
});

ipcMain.handle("set-blur", (event, { blur, saturation }) => {
	if (blur !== undefined) {
		appearanceSettings.blur = Math.max(0, Math.min(100, blur));
	}
	if (saturation !== undefined) {
		appearanceSettings.saturation = Math.max(100, Math.min(300, saturation));
	}
	saveSettings();
	// Apply to all windows
	windows.forEach((win) => {
		applyBlurSettings(win);
	});
	return { success: true, settings: appearanceSettings };
});

ipcMain.handle("get-appearance-settings", () => {
	return appearanceSettings;
});

ipcMain.handle("reload-css", (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win) {
		win.reload();
	}
	return { success: true };
});

ipcMain.handle("pick-project-folder", async (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	const result = await dialog.showOpenDialog(win, {
		properties: ["openDirectory"],
		title: "Select Project Folder",
	});

	if (result.canceled || result.filePaths.length === 0) {
		return { success: false, canceled: true };
	}

	const folderPath = result.filePaths[0];
	const folderName = path.basename(folderPath);
	const isGitRepo = fs.existsSync(path.join(folderPath, ".git"));

	return {
		success: true,
		canceled: false,
		path: folderPath,
		name: folderName,
		isGitRepo,
	};
});

// Track running stdio MCP server processes
const stdioServers = new Map();

// MCP Stdio Health Check - spawns the MCP server and performs initialization handshake
ipcMain.handle("mcp-health-check", async (event, config) => {
	const { command, args = [], env = [] } = config;

	return new Promise((resolve) => {
		try {
			const envObj = {};
			env.forEach(({ key, value }) => {
				envObj[key] = value;
			});

			const proc = spawn(command, args, {
				env: { ...process.env, ...envObj },
				stdio: ["pipe", "pipe", "pipe"],
				shell: true,
			});

			let stdout = "";
			let stderr = "";
			let resolved = false;

			const timeout = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					proc.kill();
					resolve({ ready: false, error: "Timeout waiting for MCP server response" });
				}
			}, 10000);

			proc.stdout.on("data", (data) => {
				stdout += data.toString();
				try {
					const lines = stdout.split("\n").filter((l) => l.trim());
					for (const line of lines) {
						const msg = JSON.parse(line);
						if (msg.result && msg.result.capabilities) {
							if (!resolved) {
								proc.stdin.write(
									JSON.stringify({
										jsonrpc: "2.0",
										id: 2,
										method: "tools/list",
									}) + "\n"
								);
							}
						}
						if (msg.result && msg.result.tools) {
							resolved = true;
							clearTimeout(timeout);
							proc.kill();
							resolve({
								ready: true,
								tools: msg.result.tools.map((t) => ({
									name: t.name,
									description: t.description,
								})),
							});
						}
					}
				} catch (e) {
					// Not valid JSON yet, keep buffering
				}
			});

			proc.stderr.on("data", (data) => {
				stderr += data.toString();
			});

			proc.on("error", (err) => {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeout);
					resolve({ ready: false, error: `Failed to spawn: ${err.message}` });
				}
			});

			proc.on("close", (code) => {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeout);
					resolve({ ready: false, error: stderr || `Process exited with code ${code}` });
				}
			});

			proc.stdin.write(
				JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "initialize",
					params: {
						protocolVersion: "2024-11-05",
						capabilities: {},
						clientInfo: { name: "chat-ui", version: "1.0.0" },
					},
				}) + "\n"
			);
		} catch (err) {
			return { success: false, error: err.message };
		}
	});
});

// Start and keep a stdio MCP server running for tool calls
ipcMain.handle("mcp-start-server", async (event, config) => {
	const { serverId, command, args = [], env = [] } = config;

	if (stdioServers.has(serverId)) {
		return { success: true, message: "Server already running" };
	}

	return new Promise((resolve) => {
		try {
			const envObj = {};
			env.forEach(({ key, value }) => {
				envObj[key] = value;
			});

			const proc = spawn(command, args, {
				env: { ...process.env, ...envObj },
				stdio: ["pipe", "pipe", "pipe"],
				shell: true,
			});

			let initialized = false;
			let buffer = "";
			let messageId = 1;
			const pendingRequests = new Map();

			proc.stdout.on("data", (data) => {
				buffer += data.toString();
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const msg = JSON.parse(line);
						if (msg.id && pendingRequests.has(msg.id)) {
							const { resolve } = pendingRequests.get(msg.id);
							pendingRequests.delete(msg.id);
							resolve(msg);
						}
						if (msg.result?.capabilities && !initialized) {
							initialized = true;
							resolve({ success: true });
						}
					} catch (e) {
						// Not valid JSON, ignore
					}
				}
			});

			proc.stderr.on("data", (data) => {
				console.error(`[mcp-stdio ${serverId}] stderr:`, data.toString());
			});

			proc.on("error", (err) => {
				if (!initialized) {
					resolve({ success: false, error: `Failed to spawn: ${err.message}` });
				}
				stdioServers.delete(serverId);
			});

			proc.on("close", (code) => {
				if (!initialized) {
					resolve({ success: false, error: `Process exited with code ${code}` });
				}
				stdioServers.delete(serverId);
			});

			const sendRequest = (method, params = {}) => {
				return new Promise((reqResolve, reqReject) => {
					const id = messageId++;
					const timeout = setTimeout(() => {
						pendingRequests.delete(id);
						reqReject(new Error("Request timeout"));
					}, 30000);

					pendingRequests.set(id, {
						resolve: (msg) => {
							clearTimeout(timeout);
							if (msg.error) {
								reqReject(new Error(msg.error.message || JSON.stringify(msg.error)));
							} else {
								reqResolve(msg.result);
							}
						},
					});

					proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
				});
			};

			stdioServers.set(serverId, { proc, sendRequest });

			proc.stdin.write(
				JSON.stringify({
					jsonrpc: "2.0",
					id: messageId++,
					method: "initialize",
					params: {
						protocolVersion: "2024-11-05",
						capabilities: {},
						clientInfo: { name: "chat-ui", version: "1.0.0" },
					},
				}) + "\n"
			);

			setTimeout(() => {
				if (!initialized) {
					proc.kill();
					stdioServers.delete(serverId);
					resolve({ success: false, error: "Initialization timeout" });
				}
			}, 10000);
		} catch (err) {
			resolve({ success: false, error: err.message });
		}
	});
});

// Call a tool on a running stdio MCP server
ipcMain.handle("mcp-call-tool", async (event, config) => {
	const { serverId, tool, args = {} } = config;

	const server = stdioServers.get(serverId);
	if (!server) {
		return { success: false, error: "Server not running" };
	}

	try {
		const result = await server.sendRequest("tools/call", { name: tool, arguments: args });
		const content = Array.isArray(result?.content) ? result.content : [];
		const textParts = content
			.filter((p) => p?.type === "text" && typeof p?.text === "string")
			.map((p) => p.text);
		return { success: true, text: textParts.join("\n"), content };
	} catch (err) {
		return { success: false, error: err.message };
	}
});

// Stop a running stdio MCP server
ipcMain.handle("mcp-stop-server", async (event, config) => {
	const { serverId } = config;

	const server = stdioServers.get(serverId);
	if (!server) {
		return { success: true, message: "Server not running" };
	}

	try {
		server.proc.kill();
		stdioServers.delete(serverId);
		return { success: true };
	} catch (err) {
		return { success: false, error: err.message };
	}
});

// List tools from a running stdio MCP server
ipcMain.handle("mcp-list-tools", async (event, config) => {
	const { serverId } = config;

	const server = stdioServers.get(serverId);
	if (!server) {
		return { success: false, error: "Server not running" };
	}

	try {
		const result = await server.sendRequest("tools/list", {});
		const tools = Array.isArray(result?.tools) ? result.tools : [];
		return {
			success: true,
			tools: tools.map((t) => ({
				name: t.name,
				description: t.description,
				inputSchema: t.inputSchema,
			})),
		};
	} catch (err) {
		return { success: false, error: err.message };
	}
});
