<script lang="ts">
	/** Page title — will be formatted as "title - davis9001.dev" unless `rawTitle` is true */
	export let title: string = '';
	/** Meta description */
	export let description: string = 'The personal website of David Monaghan aka davis9001.';
	/** Canonical URL path (e.g. "/portfolio") — full URL built automatically */
	export let path: string = '';
	/** OG image URL — defaults to cover.png */
	export let imageUrl: string = 'https://davis9001.dev/cover.png';
	/** OG type — defaults to "website" */
	export let type: string = 'website';
	/** If true, use title as-is without appending site name */
	export let rawTitle: boolean = false;
	/** Optional article published date (ISO string) */
	export let publishedAt: string = '';

	const SITE_NAME = 'davis9001.dev';
	const SITE_URL = 'https://davis9001.dev';

	$: fullTitle = rawTitle ? title : title ? `${title} - ${SITE_NAME}` : SITE_NAME;
	$: fullUrl = path ? `${SITE_URL}${path}` : SITE_URL;
</script>

<svelte:head>
	<!-- HTML Meta Tags -->
	<title>{fullTitle}</title>
	<meta name="description" content={description} />

	<!-- Google / Search Engine Tags -->
	<meta itemprop="name" content={fullTitle} />
	<meta itemprop="description" content={description} />
	<meta itemprop="image" content={imageUrl} />

	<!-- Facebook / Open Graph -->
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="en" />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={fullUrl} />
	<meta property="og:image" content={imageUrl} />

	<!-- X / Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />

	<!-- Canonical -->
	<link rel="canonical" href={fullUrl} />

	{#if publishedAt}
		<meta property="article:published_time" content={publishedAt} />
	{/if}
</svelte:head>
