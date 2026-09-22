/**
 * Discovery `Link` response headers (RFC 8288).
 *
 * An agent that lands on any page of this site should be able to find the
 * machine-readable description of it without guessing a filename. `llms.txt`
 * has been served at a stable path for a while; this advertises it.
 *
 * The logic lives here rather than inside `hooks.server.ts` because the hook
 * file is excluded from coverage, and because the mechanism is generic enough
 * to move upstream into NebulaKit. Only the link table below is site-specific.
 *
 * See plans/agent-readiness-discovery-metadata.md section 5. More relations
 * (`api-catalog`, `service-desc`, `service-doc`) join the table when their
 * targets exist — never before, because a `Link` to a 404 is worse than no
 * `Link` at all.
 */

export interface DiscoveryLink {
	/** Root-relative target. Keeps the origin out of the source. */
	href: string;
	/** RFC 8288 relation type. */
	rel: string;
	/** Optional media type hint for the target. */
	type?: string;
}

export const DISCOVERY_LINKS: readonly DiscoveryLink[] = [
	{ href: '/llms.txt', rel: 'describedby', type: 'text/plain' }
];

/** Serialise one link into RFC 8288 field-value form. */
export function formatDiscoveryLink(link: DiscoveryLink): string {
	const params = [`rel="${link.rel}"`];
	if (link.type) {
		params.push(`type="${link.type}"`);
	}
	return `<${link.href}>; ${params.join('; ')}`;
}

/**
 * True when this response should carry the discovery links.
 *
 * Two exclusions:
 * - `/api` — those routes own their headers, and relaxing the skip for the
 *   whole subtree would grow discovery headers on admin responses too.
 * - anything that is not an HTML document — assets keep clean headers.
 */
export function shouldAttachDiscoveryLinks(pathname: string, response: Response): boolean {
	if (pathname.startsWith('/api')) {
		return false;
	}

	const contentType = response.headers.get('Content-Type');
	return contentType !== null && contentType.split(';')[0].trim().toLowerCase() === 'text/html';
}

/**
 * Append the discovery links to a response, in place.
 *
 * Appends rather than sets: a route may already have declared a `Link` of its
 * own, and clobbering it would be a silent regression.
 */
export function applyDiscoveryLinks(pathname: string, response: Response): Response {
	if (!shouldAttachDiscoveryLinks(pathname, response)) {
		return response;
	}

	for (const link of DISCOVERY_LINKS) {
		response.headers.append('Link', formatDiscoveryLink(link));
	}

	return response;
}
