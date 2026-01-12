const { app, BrowserWindow, screen, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Track all windows
let windows = new Set();

// Appearance settings with defaults
let appearanceSettings = {
	vibrancy: "fullscreen-ui",
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
      top: 52px !important;
      height: calc(100vh - 52px) !important;
    }

    /* Reduce gaps in chat messages */
    .flex.flex-col.gap-4 {
      gap: 0.75rem !important;
    }

    /* Glass panel effect - optional class for specific elements */
    .glass-panel {
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(${panelBlur}px) saturate(${Math.max(100, saturation - 30)}%);
      -webkit-backdrop-filter: blur(${panelBlur}px) saturate(${Math.max(100, saturation - 30)}%);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
    }

    /* Dark mode glass panel adjustments */
    .dark .glass-panel {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
    }
  `);
}

function createWindow() {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	const win = new BrowserWindow({
		width: Math.floor(width * 0.8),
		height: Math.floor(height * 0.8),
		minWidth: 800,
		minHeight: 600,
		transparent: true,
		titleBarStyle: "customButtonsOnHover",
		trafficLightPosition: { x: 12, y: 12 }, // Traffic lights appear on hover
		vibrancy: "ultra-dark", // macOS vibrancy effect
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

	// Apply additional window effects for macOS
	if (process.platform === "darwin") {
		// Keep window buttons visible for tab bar (frameless mode compatibility)
		win.setWindowButtonVisibility(true);

		// Enable backdrop blur for liquid glass effect
		try {
			// Apply saved vibrancy setting
			win.setVibrancy(appearanceSettings.vibrancy);
		} catch (e) {
			console.log("Vibrancy not supported:", e);
		}

		// Show tab bar by default
		win.toggleTabBar();
	}

	// Set window opacity
	win.setOpacity(appearanceSettings.opacity);

	// Windows-specific transparency
	if (process.platform === "win32") {
		win.setBackgroundColor("#00000000");
	}

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
ipcMain.handle("set-vibrancy", (event, type) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (process.platform === "darwin" && win) {
		try {
			win.setVibrancy(type);
			appearanceSettings.vibrancy = type;
			saveSettings();
			// Apply to all windows
			windows.forEach((w) => {
				try {
					w.setVibrancy(type);
				} catch (e) {
					console.error("Failed to set vibrancy on window:", e);
				}
			});
			return { success: true };
		} catch (e) {
			console.error("Failed to set vibrancy:", e);
			return { success: false, error: e.message };
		}
	}
	return { success: false, error: "Vibrancy not supported on this platform" };
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
