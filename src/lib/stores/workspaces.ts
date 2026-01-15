import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";

export interface Workspace {
	id: string;
	path: string;
	name: string;
	isGitRepo: boolean;
	isCollapsed: boolean;
}

interface WorkspacesState {
	workspaces: Workspace[];
	activeWorkspaceId: string | null;
	noWorkspaceCollapsed: boolean;
	// Maps conversationId -> workspaceId (one chat = one workspace max)
	conversationWorkspaces: Record<string, string>;
}

const STORAGE_KEY = "chat-ui-workspaces";

function loadFromStorage(): WorkspacesState {
	const defaultState: WorkspacesState = {
		workspaces: [],
		activeWorkspaceId: null,
		noWorkspaceCollapsed: false,
		conversationWorkspaces: {},
	};

	if (!browser) {
		return defaultState;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...defaultState, ...parsed };
		}
	} catch (e) {
		console.error("Failed to load workspaces from storage:", e);
	}

	return defaultState;
}

function saveToStorage(state: WorkspacesState) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (e) {
		console.error("Failed to save workspaces to storage:", e);
	}
}

function createWorkspacesStore() {
	const { subscribe, set, update } = writable<WorkspacesState>(loadFromStorage());

	subscribe((state) => saveToStorage(state));

	return {
		subscribe,

		async addWorkspace(): Promise<Workspace | null> {
			if (!browser || !(window as any).electronAPI) {
				return null;
			}

			const result = await (window as any).electronAPI.pickProjectFolder();
			if (!result.success || result.canceled) {
				return null;
			}

			const workspace: Workspace = {
				id: `ws_${Date.now()}`,
				path: result.path,
				name: result.name,
				isGitRepo: result.isGitRepo,
				isCollapsed: true,
			};

			update((state) => {
				const exists = state.workspaces.some((w) => w.path === workspace.path);
				if (exists) {
					return {
						...state,
						activeWorkspaceId: state.workspaces.find((w) => w.path === workspace.path)?.id ?? null,
					};
				}

				return {
					...state,
					workspaces: [...state.workspaces, workspace],
					activeWorkspaceId: workspace.id,
				};
			});

			return workspace;
		},

		removeWorkspace(workspaceId: string) {
			update((state) => ({
				...state,
				workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
				activeWorkspaceId: state.activeWorkspaceId === workspaceId ? null : state.activeWorkspaceId,
			}));
		},

		setActiveWorkspace(workspaceId: string | null) {
			update((state) => ({
				...state,
				activeWorkspaceId: workspaceId,
			}));
		},

		toggleWorkspaceCollapsed(workspaceId: string) {
			update((state) => ({
				...state,
				workspaces: state.workspaces.map((w) =>
					w.id === workspaceId ? { ...w, isCollapsed: !w.isCollapsed } : w
				),
			}));
		},

		toggleNoWorkspaceCollapsed() {
			update((state) => ({
				...state,
				noWorkspaceCollapsed: !state.noWorkspaceCollapsed,
			}));
		},

		getWorkspaceById(id: string): Workspace | undefined {
			return get({ subscribe }).workspaces.find((w) => w.id === id);
		},

		getWorkspaceByPath(path: string): Workspace | undefined {
			return get({ subscribe }).workspaces.find((w) => w.path === path);
		},

		// Set a conversation's workspace (replaces any previous workspace)
		addConversationToWorkspace(conversationId: string, workspaceId: string) {
			update((state) => ({
				...state,
				conversationWorkspaces: {
					...state.conversationWorkspaces,
					[conversationId]: workspaceId,
				},
			}));
		},

		// Remove a conversation from its workspace
		removeConversationFromWorkspace(conversationId: string) {
			update((state) => {
				const newMap = { ...state.conversationWorkspaces };
				delete newMap[conversationId];
				return { ...state, conversationWorkspaces: newMap };
			});
		},

		// Get the workspace ID for a conversation (or null if not in any workspace)
		getConversationWorkspace(conversationId: string): string | null {
			return get({ subscribe }).conversationWorkspaces[conversationId] ?? null;
		},

		// Get all conversation IDs in a workspace
		getConversationsForWorkspace(workspaceId: string): string[] {
			const state = get({ subscribe });
			return Object.entries(state.conversationWorkspaces)
				.filter(([, wsId]) => wsId === workspaceId)
				.map(([convId]) => convId);
		},

		// Check if a conversation is in a specific workspace
		isConversationInWorkspace(conversationId: string, workspaceId: string): boolean {
			return get({ subscribe }).conversationWorkspaces[conversationId] === workspaceId;
		},

		// Check if a conversation is in ANY workspace
		isConversationInAnyWorkspace(conversationId: string): boolean {
			return conversationId in get({ subscribe }).conversationWorkspaces;
		},
	};
}

export const workspaces = createWorkspacesStore();

export const allWorkspaces = derived(workspaces, ($ws) => $ws.workspaces);
export const activeWorkspaceId = derived(workspaces, ($ws) => $ws.activeWorkspaceId);
export const activeWorkspace = derived(
	workspaces,
	($ws) => $ws.workspaces.find((w) => w.id === $ws.activeWorkspaceId) ?? null
);
export const noWorkspaceCollapsed = derived(workspaces, ($ws) => $ws.noWorkspaceCollapsed);
export const conversationWorkspaces = derived(workspaces, ($ws) => $ws.conversationWorkspaces);
