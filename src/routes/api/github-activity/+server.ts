import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DAYS_TO_FETCH = 63; // 9 weeks
const USERNAME = 'davis9001';
const TIMEZONE = 'America/New_York';

interface ContributionDay {
	date: string;
	count: number;
	level: number;
	pmRatio: number;
}

function classifyTimestamp(isoTimestamp: string): { dateKey: string; hour: number } | null {
	const dt = new Date(isoTimestamp);
	if (isNaN(dt.getTime())) return null;

	const localParts = dt.toLocaleString('en-US', {
		timeZone: TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: 'numeric',
		hour12: false
	});

	const dateMatch = localParts.match(/(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2})/);
	if (!dateMatch) return null;

	const dateKey = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
	const hour = parseInt(dateMatch[4]) % 24;
	return { dateKey, hour };
}

function addHourEntry(
	map: Map<string, { am: number; pm: number }>,
	dateKey: string,
	hour: number
) {
	const entry = map.get(dateKey) ?? { am: 0, pm: 0 };
	if (hour < 12) {
		entry.am++;
	} else {
		entry.pm++;
	}
	map.set(dateKey, entry);
}

async function fetchCommitTimestampsGraphQL(
	since: string,
	until: string,
	token?: string
): Promise<Map<string, { am: number; pm: number }>> {
	const countsByDate = new Map<string, { am: number; pm: number }>();
	
	if (!token) {
		console.log('[github-activity] No GH_API_TOKEN — skipping GraphQL commit timestamps');
		return countsByDate;
	}

	try {
		const contribQuery = `
			query($login: String!, $from: DateTime!, $to: DateTime!) {
				user(login: $login) {
					contributionsCollection(from: $from, to: $to) {
						commitContributionsByRepository(maxRepositories: 50) {
							repository {
								nameWithOwner
								isPrivate
							}
							contributions(first: 1) {
								totalCount
							}
						}
					}
				}
			}
		`;

		const contribResp = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'User-Agent': 'davis9001.dev/1.0'
			},
			body: JSON.stringify({
				query: contribQuery,
				variables: { login: USERNAME, from: since, to: until }
			})
		});

		if (!contribResp.ok) {
			console.warn(`[github-activity] GraphQL contrib query failed: ${contribResp.status}`);
			return countsByDate;
		}

		const contribData = await contribResp.json();
		if (contribData.errors) {
			console.warn('[github-activity] GraphQL contrib errors:', contribData.errors);
			return countsByDate;
		}

		const repos = contribData?.data?.user?.contributionsCollection?.commitContributionsByRepository ?? [];

		console.log(`[github-activity] Found ${repos.length} repos with contributions in range`);

		for (const repoInfo of repos) {
			const nameWithOwner: string = repoInfo.repository.nameWithOwner;
			const [owner, name] = nameWithOwner.split('/');
			const totalCount: number = repoInfo.contributions?.totalCount ?? 0;
			if (totalCount === 0) continue;

			try {
				let page = 1;
				const maxPages = 5;
				let fetched = 0;

				while (page <= maxPages) {
					const commitsUrl = `https://api.github.com/repos/${owner}/${name}/commits?author=${USERNAME}&since=${since}&until=${until}&per_page=100&page=${page}`;
					const commitsResp = await fetch(commitsUrl, {
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: 'application/vnd.github.v3+json',
							'User-Agent': 'davis9001.dev/1.0'
						}
					});

					if (!commitsResp.ok) {
						console.warn(`[github-activity] Commits fetch for ${nameWithOwner} page ${page}: ${commitsResp.status}`);
						break;
					}

					const commits = await commitsResp.json();
					if (!Array.isArray(commits) || commits.length === 0) break;

					for (const commit of commits) {
						const authorDate = commit?.commit?.author?.date ?? commit?.commit?.committer?.date;
						if (!authorDate) continue;

						const result = classifyTimestamp(authorDate);
						if (result) {
							addHourEntry(countsByDate, result.dateKey, result.hour);
						}
					}

					fetched += commits.length;
					if (commits.length < 100) break;
					page++;
				}

				if (fetched > 0) {
					console.log(`[github-activity] ${nameWithOwner}: ${fetched} commits with timestamps`);
				}
			} catch (repoErr) {
				console.warn(`[github-activity] Error fetching commits for ${nameWithOwner}:`, repoErr);
			}
		}

		console.log(`[github-activity] GraphQL+REST: got timestamps for ${countsByDate.size} distinct dates`);
	} catch (err) {
		console.warn('[github-activity] Failed to fetch GraphQL commit timestamps:', err);
	}

	return countsByDate;
}

async function fetchEventHours(token?: string): Promise<Map<string, { am: number; pm: number }>> {
	const countsByDate = new Map<string, { am: number; pm: number }>();

	const headers: Record<string, string> = {
		Accept: 'application/vnd.github.v3+json',
		'User-Agent': 'davis9001.dev/1.0'
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	try {
		const eventsPath = token ? 'events' : 'events/public';
		const maxPages = token ? 5 : 3;

		for (let page = 1; page <= maxPages; page++) {
			const url = `https://api.github.com/users/${USERNAME}/${eventsPath}?per_page=100&page=${page}`;
			const resp = await fetch(url, { headers });
			if (!resp.ok) {
				console.warn(`[github-activity] Events API page ${page}: ${resp.status}`);
				break;
			}
			const events = await resp.json();
			if (!Array.isArray(events) || events.length === 0) break;

			for (const event of events) {
				if (!event.created_at) continue;
				const result = classifyTimestamp(event.created_at);
				if (result) {
					addHourEntry(countsByDate, result.dateKey, result.hour);
				}
			}
		}

		console.log(`[github-activity] Events API: fetched hours for ${countsByDate.size} distinct dates`);
	} catch (err) {
		console.warn('[github-activity] Failed to fetch event hours:', err);
	}

	return countsByDate;
}

function parseContributionCalendar(html: string): Map<string, { count: number; level: number }> {
	const contributions = new Map<string, { count: number; level: number }>();
	const idToDate = new Map<string, string>();

	const cellRegex = /data-date="(\d{4}-\d{2}-\d{2})"\s+id="(contribution-day-component-\d+-\d+)"\s+data-level="(\d)"/g;
	let match;

	while ((match = cellRegex.exec(html)) !== null) {
		const date = match[1];
		const id = match[2];
		const level = parseInt(match[3]) || 0;
		idToDate.set(id, date);
		contributions.set(date, { count: 0, level });
	}

	console.log(`[github-activity] Found ${idToDate.size} contribution cells`);

	const tooltipRegex = /<tool-tip[^>]*for="(contribution-day-component-\d+-\d+)"[^>]*>(?:No contributions|(\d+)\s+contribution)/g;
	let tooltipMatches = 0;

	while ((match = tooltipRegex.exec(html)) !== null) {
		const cellId = match[1];
		const count = match[2] ? parseInt(match[2]) : 0;
		const date = idToDate.get(cellId);
		tooltipMatches++;

		if (date) {
			const existing = contributions.get(date);
			if (existing) {
				existing.count = count;
			} else {
				contributions.set(date, { count, level: 0 });
			}
		}
	}

	console.log(`[github-activity] Matched ${tooltipMatches} tooltips with counts`);
	return contributions;
}

export const GET: RequestHandler = async ({ platform }) => {
	try {
		console.log('[github-activity] Fetching contribution calendar from GitHub profile...');

		const response = await fetch(`https://github.com/users/${USERNAME}/contributions`, {
			headers: {
				Accept: 'text/html',
				'User-Agent': 'Mozilla/5.0 (compatible; davis9001.dev/1.0)'
			}
		});

		console.log(`[github-activity] Response status: ${response.status}`);

		if (!response.ok) {
			console.error(`[github-activity] Failed to fetch contributions: ${response.status}`);
			return json([], {
				headers: {
					'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
				}
			});
		}

		const html = await response.text();
		console.log(`[github-activity] Received HTML (${html.length} bytes)`);

		const contributions = parseContributionCalendar(html);
		console.log(`[github-activity] Parsed ${contributions.size} contribution days`);

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const startDate = new Date(today);
		startDate.setDate(today.getDate() - DAYS_TO_FETCH);
		const sinceISO = startDate.toISOString();
		const untilISO = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

		const token = platform?.env?.GH_API_TOKEN;

		const [commitHours, eventHours] = await Promise.all([
			fetchCommitTimestampsGraphQL(sinceISO, untilISO, token),
			fetchEventHours(token)
		]);

		const mergedHours = new Map<string, { am: number; pm: number }>();
		for (const [dateKey, counts] of commitHours) {
			mergedHours.set(dateKey, { ...counts });
		}
		for (const [dateKey, counts] of eventHours) {
			const existing = mergedHours.get(dateKey);
			if (existing) {
				existing.am += counts.am;
				existing.pm += counts.pm;
			} else {
				mergedHours.set(dateKey, { ...counts });
			}
		}

		console.log(`[github-activity] Merged AM/PM data for ${mergedHours.size} dates (commits: ${commitHours.size}, events: ${eventHours.size})`);

		const activityData: ContributionDay[] = [];

		for (let i = 0; i < DAYS_TO_FETCH; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateKey = date.toISOString().split('T')[0];

			const contribution = contributions.get(dateKey);
			const counts = mergedHours.get(dateKey);
			
			let pmRatio = -1;
			if (counts) {
				const total = counts.am + counts.pm;
				if (total > 0) {
					pmRatio = Math.round((counts.pm / total) * 100) / 100;
				}
			}

			if (contribution) {
				activityData.push({
					date: dateKey,
					count: contribution.count,
					level: contribution.level,
					pmRatio
				});
			} else {
				activityData.push({
					date: dateKey,
					count: 0,
					level: 0,
					pmRatio: -1
				});
			}
		}

		activityData.sort((a, b) => a.date.localeCompare(b.date));

		const totalContributions = activityData.reduce((sum, day) => sum + day.count, 0);
		const activeDays = activityData.filter(day => day.count > 0).length;
		console.log(`[github-activity] Total contributions in last ${DAYS_TO_FETCH} days: ${totalContributions}`);
		console.log(`[github-activity] Active days: ${activeDays}`);

		return json(activityData, {
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
				Pragma: 'no-cache',
				Expires: '0'
			}
		});
	} catch (error) {
		console.error('[github-activity] Error:', error);
		return json([], {
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
			}
		});
	}
};
