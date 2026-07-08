/** Shared constants for the GitHub sync feature */
export const GITHUB_SYNC_PAT_KV_KEY = 'github_sync_pat';

export interface StoredGithubPat {
	token: string;
	login: string;
	updatedAt: string;
}
