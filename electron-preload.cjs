const { contextBridge, ipcRenderer } = require("electron");

// Expose window controls and appearance settings to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
	// Window controls
	windowMinimize: () => ipcRenderer.invoke("window-minimize"),
	windowMaximize: () => ipcRenderer.invoke("window-maximize"),
	windowClose: () => ipcRenderer.invoke("window-close"),

	// Appearance settings
	setVibrancy: (type) => ipcRenderer.invoke("set-vibrancy", type),
	setBackgroundMaterial: (material) => ipcRenderer.invoke("set-background-material", material),
	setOpacity: (opacity) => ipcRenderer.invoke("set-opacity", opacity),
	setBlur: (blur) => ipcRenderer.invoke("set-blur", blur),
	getAppearanceSettings: () => ipcRenderer.invoke("get-appearance-settings"),
	reloadCSS: () => ipcRenderer.invoke("reload-css"),

	// MCP Stdio support
	mcpHealthCheck: (config) => ipcRenderer.invoke("mcp-health-check", config),
	mcpStartServer: (config) => ipcRenderer.invoke("mcp-start-server", config),
	mcpCallTool: (config) => ipcRenderer.invoke("mcp-call-tool", config),
	mcpStopServer: (config) => ipcRenderer.invoke("mcp-stop-server", config),
	mcpListTools: (config) => ipcRenderer.invoke("mcp-list-tools", config),

	// Project folder & Git operations
	pickProjectFolder: () => ipcRenderer.invoke("pick-project-folder"),
	gitStatus: (config) => ipcRenderer.invoke("git-status", config),
	gitDiff: (config) => ipcRenderer.invoke("git-diff", config),
	readFile: (config) => ipcRenderer.invoke("read-file", config),
	listDirectory: (config) => ipcRenderer.invoke("list-directory", config),

	// Platform info
	platform: process.platform,
	isElectron: true,
});
