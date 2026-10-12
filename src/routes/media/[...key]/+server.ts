/**
 * Public media serving route.
 * GET /media/[...key] — streams an object from the R2 BUCKET binding.
 * Keys are UUID-addressed and immutable, so responses cache aggressively.
 * Byte ranges are honoured (206), because Safari will not play video without them.
 */
import { isValidMediaKey } from '$lib/cms/upload';
import { parseByteRange } from '$lib/server/media-range';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, params, request }) => {
	const bucket = platform?.env?.BUCKET;
	if (!bucket) {
		throw error(500, 'Storage not available');
	}

	const key = params.key;
	if (!isValidMediaKey(key)) {
		throw error(404, 'Not found');
	}

	const rangeHeader = request.headers.get('Range');
	if (rangeHeader) {
		const head = await bucket.head(key);
		if (!head) {
			throw error(404, 'Not found');
		}
		const range = parseByteRange(rangeHeader, head.size);
		if (range === 'unsatisfiable') {
			return new Response(null, {
				status: 416,
				headers: { 'Content-Range': `bytes */${head.size}` }
			});
		}
		if (range) {
			const part = await bucket.get(key, { range });
			if (!part) {
				throw error(404, 'Not found');
			}
			const end = range.offset + range.length - 1;
			return new Response((part as { body: unknown }).body as BodyInit, {
				status: 206,
				headers: {
					'Content-Type': head.httpMetadata?.contentType ?? 'application/octet-stream',
					'Cache-Control': 'public, max-age=31536000, immutable',
					'Accept-Ranges': 'bytes',
					'Content-Range': `bytes ${range.offset}-${end}/${head.size}`,
					'Content-Length': String(range.length),
					...(head.httpEtag ? { ETag: head.httpEtag } : {})
				}
			});
		}
	}

	const object = await bucket.get(key);
	if (!object) {
		throw error(404, 'Not found');
	}

	const etag = object.httpEtag;
	if (etag && request.headers.get('If-None-Match') === etag) {
		return new Response(null, { status: 304, headers: { ETag: etag } });
	}

	const headers: Record<string, string> = {
		'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
		'Cache-Control': 'public, max-age=31536000, immutable',
		'Accept-Ranges': 'bytes'
	};
	if (etag) {
		headers.ETag = etag;
	}

	return new Response(object.body as unknown as BodyInit, { headers });
};
