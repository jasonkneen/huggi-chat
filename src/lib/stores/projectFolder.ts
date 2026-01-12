import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";

export interface ProjectFolder {
	path: string;
	name: string;
	isGitRepo: boolean;
}

export interface GitFileStatus {
	status: string;
	path: string;
	staged: boolean;
	unstaged: boolean;
	untracked: boolean;
}

interface ProjectFolderState {
	current: ProjectFolder | null;
	gitFiles: GitFileStatus[];
	isLoadingGit: boolean;
	selectedFile: string | null;
}

const initialState: ProjectFolderState = {
	current: null,
	gitFiles: [],
	isLoadingGit: false,
	selectedFile: null,
};

function createProjectFolderStore() {
	const { subscribe, set, update } = writable<ProjectFolderState>(initialState);

	return {
		subscribe,

		async pickFolder(): Promise<ProjectFolder | null> {
			if (!browser || !(window as any).electronAPI) {
				return null;
			}

			const result = await (window as any).electronAPI.pickProjectFolder();
			if (!result.success || result.canceled) {
				return null;
			}

			const folder: ProjectFolder = {
				path: result.path,
				name: result.name,
				isGitRepo: result.isGitRepo,
			};

			update((state) => ({
				...state,
				current: folder,
				gitFiles: [],
				selectedFile: null,
			}));

			if (folder.isGitRepo) {
				await this.refreshGitStatus();
			}

			return folder;
		},

		setFolder(folder: ProjectFolder | null) {
			update((state) => ({
				...state,
				current: folder,
				gitFiles: [],
				selectedFile: null,
			}));

			if (folder?.isGitRepo) {
				this.refreshGitStatus();
			}
		},

		async refreshGitStatus() {
			const state = get({ subscribe });
			if (!state.current?.isGitRepo) return;

			if (!browser || !(window as any).electronAPI) return;

			update((s) => ({ ...s, isLoadingGit: true }));

			try {
				const result = await (window as any).electronAPI.gitStatus({
					projectPath: state.current.path,
				});

				if (result.success) {
					update((s) => ({
						...s,
						gitFiles: result.files,
						isLoadingGit: false,
					}));
				} else {
					update((s) => ({ ...s, isLoadingGit: false }));
				}
			} catch {
				update((s) => ({ ...s, isLoadingGit: false }));
			}
		},

		selectFile(filePath: string | null) {
			update((state) => ({ ...state, selectedFile: filePath }));
		},

		clear() {
			set(initialState);
		},
	};
}

export const projectFolder = createProjectFolderStore();

export const currentProject = derived(projectFolder, ($pf) => $pf.current);
export const gitFiles = derived(projectFolder, ($pf) => $pf.gitFiles);
export const isGitLoading = derived(projectFolder, ($pf) => $pf.isLoadingGit);
export const selectedGitFile = derived(projectFolder, ($pf) => $pf.selectedFile);
export const hasChanges = derived(projectFolder, ($pf) => $pf.gitFiles.length > 0);
