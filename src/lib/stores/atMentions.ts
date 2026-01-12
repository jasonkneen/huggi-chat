import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";
import {
	type AtMentionItem,
	type AgentMeta,
	parseAgentFile,
	agentToMentionItem,
} from "$lib/utils/atMentions";

interface AgentsState {
	agents: AgentMeta[];
	loaded: boolean;
}

function createAgentsStore() {
	const { subscribe, set, update } = writable<AgentsState>({
		agents: [],
		loaded: false,
	});

	return {
		subscribe,
		async loadAgents() {
			if (!browser) return;

			const electronAPI = (window as any).electronAPI;
			if (!electronAPI?.readAgents) {
				update((state) => ({ ...state, loaded: true }));
				return;
			}

			try {
				const agents = await electronAPI.readAgents();
				set({ agents, loaded: true });
			} catch (err) {
				console.error("Failed to load agents:", err);
				set({ agents: [], loaded: true });
			}
		},
	};
}

export const agentsStore = createAgentsStore();

export const allMentionItems = derived(agentsStore, ($state): AtMentionItem[] => {
	return $state.agents.map(agentToMentionItem);
});

export function initAtMentions() {
	if (browser) {
		agentsStore.loadAgents();
	}
}
