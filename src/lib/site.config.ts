/**
 * App identity in one place, the same shape NebulaKit uses so its components
 * (SharingMeta, form-fields) port without edits. Dependency-free on purpose.
 * SITE_NAME / SITE_URL in $lib/utils/seo remain the SEO helpers' source; keep
 * the two in step.
 */
export const site = {
	name: 'davis9001.dev',
	shortName: 'davis9001',
	tagline: 'Software and Community Architect',
	description: 'David Monaghan: software, experiments and writing.',
	/** URL-safe slug; prefixes credential field names so browsers keep this
	 *  site's saved logins apart from other NebulaKit-derived sites. */
	slug: 'davis9001',
	devPort: 4242,
	url: 'https://davis9001.dev',
	repo: 'davis9001/davis9001.dev-sveltekit',
	author: 'David Monaghan',
	authorUrl: 'https://davis9001.dev',
	showBuiltWithBadge: false
} as const;

export const repoUrl = `https://github.com/${site.repo}`;
