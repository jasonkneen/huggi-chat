import { writable } from "svelte/store";

// Track which panels are open for layout adjustments
export const leftPanelOpen = writable(true);
export const rightPanelOpen = writable(false);
