export interface OwnerIdentity {
	ownerId: string | null;
	ownerUsername: string | null;
}

export async function getOwnerIdentity(
	platform: App.Platform | undefined
): Promise<OwnerIdentity> {
	let ownerId = platform?.env?.GITHUB_OWNER_ID ?? null;
	let ownerUsername = platform?.env?.GITHUB_OWNER_USERNAME ?? null;

	if (ownerId && Number.isNaN(Number.parseInt(ownerId, 10))) {
		ownerUsername ??= ownerId;
		ownerId = null;
	}

	if ((!ownerId || !ownerUsername) && platform?.env?.KV) {
		try {
			if (!ownerId) {
				ownerId = await platform.env.KV.get('github_owner_id');
			}
			if (!ownerUsername) {
				ownerUsername = await platform.env.KV.get('github_owner_username');
			}
		} catch (err) {
			console.error('Failed to fetch owner identity from KV:', err);
		}
	}

	return {
		ownerId,
		ownerUsername
	};
}

export function matchesOwnerUsername(
	username: string | null | undefined,
	ownerUsername: string | null | undefined
): boolean {
	if (!username || !ownerUsername) {
		return false;
	}

	return username.toLowerCase() === ownerUsername.toLowerCase();
}