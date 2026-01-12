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
	conversationWorkspaces: Record<string, string[]>;
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

		addConversationToWorkspace(conversationId: string, workspaceId: string) {
			update((state) => {
				const newMap = { ...state.conversationWorkspaces };
				const existing = newMap[conversationId] ?? [];
				if (!existing.includes(workspaceId)) {
					newMap[conversationId] = [...existing, workspaceId];
				}
				return { ...state, conversationWorkspaces: newMap };
			});
		},

		removeConversationFromWorkspace(conversationId: string, workspaceId: string) {
			update((state) => {
				const newMap = { ...state.conversationWorkspaces };
				const existing = newMap[conversationId] ?? [];
				newMap[conversationId] = existing.filter((id) => id !== workspaceId);
				if (newMap[conversationId].length === 0) {
					delete newMap[conversationId];
				}
				return { ...state, conversationWorkspaces: newMap };
			});
		},

		getConversationWorkspaces(conversationId: string): string[] {
			return get({ subscribe }).conversationWorkspaces[conversationId] ?? [];
		},

		getConversationsForWorkspace(workspaceId: string): string[] {
			const state = get({ subscribe });
			return Object.entries(state.conversationWorkspaces)
				.filter(([, wsIds]) => wsIds.includes(workspaceId))
				.map(([convId]) => convId);
		},

		isConversationInWorkspace(conversationId: string, workspaceId: string): boolean {
			const wsIds = get({ subscribe }).conversationWorkspaces[conversationId] ?? [];
			return wsIds.includes(workspaceId);
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
