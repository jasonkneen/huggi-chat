import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";
import {
	BUILTIN_COMMANDS,
	type SlashCommand,
	parseUserCommandFile,
	parseSkillFile,
	userCommandToSlashCommand,
	skillToSlashCommand,
} from "$lib/utils/slashCommands";

const userCommands = writable<SlashCommand[]>([]);
const skills = writable<SlashCommand[]>([]);

export const allSlashCommands = derived([userCommands, skills], ([$userCommands, $skills]) => [
	...BUILTIN_COMMANDS,
	...$userCommands,
	...$skills,
]);

export async function loadUserCommands(): Promise<void> {
	if (!browser) return;

	const electronAPI = (window as any).electronAPI;
	if (!electronAPI?.listUserCommands) return;

	try {
		const commandFiles = await electronAPI.listUserCommands();
		const commands: SlashCommand[] = [];

		for (const file of commandFiles) {
			if (!file.name.endsWith(".md")) continue;

			const content = await electronAPI.readUserCommand(file.name);
			if (!content) continue;

			const meta = parseUserCommandFile(file.name, content);
			if (meta) {
				commands.push(userCommandToSlashCommand(meta));
			}
		}

		userCommands.set(commands);
	} catch (e) {
		console.error("Failed to load user commands:", e);
	}
}

export async function loadSkills(): Promise<void> {
	if (!browser) return;

	const electronAPI = (window as any).electronAPI;
	if (!electronAPI?.listSkills) return;

	try {
		const skillDirs = await electronAPI.listSkills();
		const loadedSkills: SlashCommand[] = [];

		for (const dir of skillDirs) {
			const skillMdPath = `${dir.path}/SKILL.md`;
			const content = await electronAPI.readFile(skillMdPath);
			if (!content) continue;

			const meta = parseSkillFile(dir.path, content);
			if (meta) {
				loadedSkills.push(skillToSlashCommand(meta));
			}
		}

		skills.set(loadedSkills);
	} catch (e) {
		console.error("Failed to load skills:", e);
	}
}

export async function initSlashCommands(): Promise<void> {
	await Promise.all([loadUserCommands(), loadSkills()]);
}

export function getSlashCommands(): SlashCommand[] {
	return get(allSlashCommands);
}
