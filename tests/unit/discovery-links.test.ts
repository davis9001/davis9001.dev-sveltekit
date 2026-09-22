/**
 * Tests for the discovery `Link` header logic.
 *
 * These import the real module rather than re-implementing the rules, so a
 * change to the hook cannot pass a test that describes the old behaviour.
 */
import { describe, it, expect } from 'vitest';
import {
	DISCOVERY_LINKS,
	formatDiscoveryLink,
	shouldAttachDiscoveryLinks,
	applyDiscoveryLinks
} from '$lib/server/discovery-links';

function htmlResponse(extra?: Record<string, string>): Response {
	return new Response('<!doctype html>', {
		headers: new Headers({ 'Content-Type': 'text/html', ...(extra ?? {}) })
	});
}

describe('formatDiscoveryLink', () => {
	it('serialises href, rel and type in RFC 8288 form', () => {
		expect(formatDiscoveryLink({ href: '/llms.txt', rel: 'describedby', type: 'text/plain' })).toBe(
			'</llms.txt>; rel="describedby"; type="text/plain"'
		);
	});

	it('omits the type parameter when there is no media type', () => {
		expect(formatDiscoveryLink({ href: '/openapi.json', rel: 'service-desc' })).toBe(
			'</openapi.json>; rel="service-desc"'
		);
	});
});

describe('DISCOVERY_LINKS', () => {
	it('advertises llms.txt as describedby', () => {
		expect(DISCOVERY_LINKS).toContainEqual({
			href: '/llms.txt',
			rel: 'describedby',
			type: 'text/plain'
		});
	});

	it('only advertises root-relative targets', () => {
		for (const link of DISCOVERY_LINKS) {
			expect(link.href.startsWith('/')).toBe(true);
		}
	});

	it('advertises nothing under a private subtree', () => {
		const forbidden = /^\/(api\/)?(admin|auth|cms|chat|setup|reset)\b/;
		for (const link of DISCOVERY_LINKS) {
			expect(link.href).not.toMatch(forbidden);
		}
	});
});

describe('shouldAttachDiscoveryLinks', () => {
	it('attaches to HTML documents', () => {
		expect(shouldAttachDiscoveryLinks('/', htmlResponse())).toBe(true);
		expect(shouldAttachDiscoveryLinks('/blog/some-post', htmlResponse())).toBe(true);
	});

	it('tolerates a charset parameter and odd casing on Content-Type', () => {
		const response = new Response('<!doctype html>', {
			headers: { 'Content-Type': 'TEXT/HTML; charset=utf-8' }
		});
		expect(shouldAttachDiscoveryLinks('/', response)).toBe(true);
	});

	it('skips API routes even when they answer with HTML', () => {
		expect(shouldAttachDiscoveryLinks('/api/projects', htmlResponse())).toBe(false);
		expect(shouldAttachDiscoveryLinks('/api/admin/users', htmlResponse())).toBe(false);
	});

	it('skips non-HTML responses', () => {
		const json = new Response('{}', { headers: { 'Content-Type': 'application/json' } });
		const text = new Response('hi', { headers: { 'Content-Type': 'text/plain' } });
		expect(shouldAttachDiscoveryLinks('/sitemap.xml', json)).toBe(false);
		expect(shouldAttachDiscoveryLinks('/llms.txt', text)).toBe(false);
	});

	it('skips a response with no Content-Type at all', () => {
		const bare = new Response(null, { status: 304 });
		bare.headers.delete('Content-Type');
		expect(shouldAttachDiscoveryLinks('/', bare)).toBe(false);
	});
});

describe('applyDiscoveryLinks', () => {
	it('adds one Link header per advertised relation', () => {
		const response = applyDiscoveryLinks('/', htmlResponse());
		const links = response.headers.get('Link');
		expect(links).toContain('</llms.txt>; rel="describedby"; type="text/plain"');
		for (const link of DISCOVERY_LINKS) {
			expect(links).toContain(formatDiscoveryLink(link));
		}
	});

	it('appends rather than replacing a Link the route already set', () => {
		const response = applyDiscoveryLinks(
			'/',
			htmlResponse({ Link: '</style.css>; rel="preload"' })
		);
		const links = response.headers.get('Link');
		expect(links).toContain('</style.css>; rel="preload"');
		expect(links).toContain('rel="describedby"');
	});

	it('leaves API responses untouched', () => {
		const response = applyDiscoveryLinks('/api/projects', htmlResponse());
		expect(response.headers.get('Link')).toBeNull();
	});

	it('leaves assets untouched', () => {
		const asset = new Response('body{}', { headers: { 'Content-Type': 'text/css' } });
		expect(applyDiscoveryLinks('/app.css', asset).headers.get('Link')).toBeNull();
	});

	it('preserves the other headers on the response', () => {
		const response = applyDiscoveryLinks('/', htmlResponse({ 'X-Frame-Options': 'SAMEORIGIN' }));
		expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
		expect(response.headers.get('Content-Type')).toBe('text/html');
	});
});
