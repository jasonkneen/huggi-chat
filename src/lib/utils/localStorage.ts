import { browser } from "$app/environment";

/**
 * Generic localStorage helper for loading and saving JSON data
 * Handles browser check, JSON parsing, and error logging
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
	if (!browser) return defaultValue;

	try {
		const json = localStorage.getItem(key);
		return json ? JSON.parse(json) : defaultValue;
	} catch (error) {
		console.error(`Failed to load ${key} from localStorage:`, error);
		return defaultValue;
	}
}

/**
 * Generic localStorage helper for saving JSON data
 * Handles browser check, JSON stringification, and error logging
 */
export function saveToStorage<T>(key: string, value: T): void {
	if (!browser) return;

	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Failed to save ${key} to localStorage:`, error);
	}
}
