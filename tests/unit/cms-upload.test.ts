/**
 * Tests for the media upload validation helpers, the admin upload API,
 * and the public media serving route (R2 mocked).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ALLOWED_IMAGE_TYPES,
	buildMediaKey,
	isValidMediaKey,
	MAX_UPLOAD_BYTES,
	mediaUrlForKey,
	validateUpload
} from '../../src/lib/cms/upload';
import { extractImageFiles, uploadImage } from '../../src/lib/cms/richtext-utils';
import { POST as uploadPOST } from '../../src/routes/api/admin/upload/+server';
import { GET as mediaGET } from '../../src/routes/media/[...key]/+server';

describe('upload validation', () => {
	it('accepts allowed image types under the size cap', () => {
		for (const [type, ext] of Object.entries(ALLOWED_IMAGE_TYPES)) {
			expect(validateUpload({ type, size: 1000 })).toEqual({ ok: true, ext });
		}
	});

	it('rejects disallowed types (including svg)', () => {
		expect(validateUpload({ type: 'image/svg+xml', size: 100 }).ok).toBe(false);
		expect(validateUpload({ type: 'application/pdf', size: 100 }).ok).toBe(false);
		expect(validateUpload({ type: '', size: 100 }).ok).toBe(false);
	});

	it('rejects oversized and empty uploads', () => {
		expect(validateUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 }).ok).toBe(false);
		expect(validateUpload({ type: 'image/png', size: 0 }).ok).toBe(false);
		expect(validateUpload({ type: 'image/png', size: NaN }).ok).toBe(false);
	});

	it('builds keys and urls', () => {
		expect(buildMediaKey('png', 'abc')).toBe('uploads/abc.png');
		expect(mediaUrlForKey('uploads/abc.png')).toBe('/media/uploads/abc.png');
	});

	it('guards media keys', () => {
		expect(isValidMediaKey('uploads/abc.png')).toBe(true);
		expect(isValidMediaKey('uploads/../secret')).toBe(false);
		expect(isValidMediaKey('other/abc.png')).toBe(false);
		expect(isValidMediaKey('uploads//x')).toBe(false);
		expect(isValidMediaKey('uploads/a b.png')).toBe(false);
	});
});

describe('extractImageFiles', () => {
	function fakeFile(type: string): File {
		return { type, name: 'f' } as unknown as File;
	}

	it('keeps only image files', () => {
		const files = [fakeFile('image/png'), fakeFile('text/plain'), fakeFile('image/webp')];
		expect(extractImageFiles({ files: files as unknown as ArrayLike<File> })).toHaveLength(2);
	});

	it('handles missing input', () => {
		expect(extractImageFiles(null)).toEqual([]);
		expect(extractImageFiles({ files: [] as unknown as ArrayLike<File> })).toEqual([]);
	});
});

describe('uploadImage', () => {
	it('returns the url on success', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ url: '/media/uploads/x.png' })
		});
		const result = await uploadImage(new File(['x'], 'x.png', { type: 'image/png' }), fetchFn);
		expect(result).toEqual({ ok: true, url: '/media/uploads/x.png' });
	});

	it('returns the API error message on failure', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ message: 'File too large' })
		});
		const result = await uploadImage(new File(['x'], 'x.png', { type: 'image/png' }), fetchFn);
		expect(result).toEqual({ ok: false, error: 'File too large' });
	});

	it('degrades network errors', async () => {
		const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
		const result = await uploadImage(new File(['x'], 'x.png', { type: 'image/png' }), fetchFn);
		expect(result).toEqual({ ok: false, error: 'Upload failed' });
	});
});

// ── API routes ────────────────────────────────────────────────────────────

const adminUser = { id: 'u1', isOwner: true, isAdmin: true };
const plainUser = { id: 'u2', isOwner: false, isAdmin: false };

function makeBucket() {
	return {
		put: vi.fn().mockResolvedValue({}),
		get: vi.fn(),
		head: vi.fn()
	};
}

function makeUploadEvent(options: { user?: unknown; bucket?: unknown; file?: File | null }) {
	const formData = new FormData();
	if (options.file) {
		formData.append('file', options.file);
	}
	return {
		locals: { user: options.user },
		platform: options.bucket === undefined ? undefined : { env: { BUCKET: options.bucket } },
		request: { formData: async () => formData }
	} as never;
}

describe('POST /api/admin/upload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('401 without a user, 403 for non-admins, 500 without a bucket', async () => {
		await expect(
			uploadPOST(makeUploadEvent({ user: undefined, bucket: makeBucket() }))
		).rejects.toMatchObject({ status: 401 });
		await expect(
			uploadPOST(makeUploadEvent({ user: plainUser, bucket: makeBucket() }))
		).rejects.toMatchObject({ status: 403 });
		await expect(uploadPOST(makeUploadEvent({ user: adminUser }))).rejects.toMatchObject({
			status: 500
		});
	});

	it('400 without a file or with a bad type', async () => {
		await expect(
			uploadPOST(makeUploadEvent({ user: adminUser, bucket: makeBucket(), file: null }))
		).rejects.toMatchObject({ status: 400 });

		await expect(
			uploadPOST(
				makeUploadEvent({
					user: adminUser,
					bucket: makeBucket(),
					file: new File(['x'], 'x.svg', { type: 'image/svg+xml' })
				})
			)
		).rejects.toMatchObject({ status: 400 });
	});

	it('stores the file in R2 and returns its public URL', async () => {
		const bucket = makeBucket();
		const response = await uploadPOST(
			makeUploadEvent({
				user: adminUser,
				bucket,
				file: new File(['png-bytes'], 'photo.png', { type: 'image/png' })
			})
		);

		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.url).toMatch(/^\/media\/uploads\/[0-9a-f-]+\.png$/);
		expect(body.contentType).toBe('image/png');
		expect(bucket.put).toHaveBeenCalledWith(
			body.key,
			expect.anything(),
			expect.objectContaining({ httpMetadata: { contentType: 'image/png' } })
		);
	});
});

describe('GET /media/[...key]', () => {
	function makeMediaEvent(options: {
		bucket?: unknown;
		key: string;
		ifNoneMatch?: string;
		range?: string;
	}) {
		return {
			platform: options.bucket === undefined ? undefined : { env: { BUCKET: options.bucket } },
			params: { key: options.key },
			request: {
				headers: {
					get: (name: string) =>
						name === 'If-None-Match'
							? (options.ifNoneMatch ?? null)
							: name === 'Range'
								? (options.range ?? null)
								: null
				}
			}
		} as never;
	}

	it('500 without a bucket, 404 for bad keys and missing objects', async () => {
		await expect(mediaGET(makeMediaEvent({ key: 'uploads/x.png' }))).rejects.toMatchObject({
			status: 500
		});

		const bucket = makeBucket();
		await expect(mediaGET(makeMediaEvent({ bucket, key: 'uploads/../etc' }))).rejects.toMatchObject(
			{ status: 404 }
		);

		bucket.get.mockResolvedValue(null);
		await expect(
			mediaGET(makeMediaEvent({ bucket, key: 'uploads/missing.png' }))
		).rejects.toMatchObject({ status: 404 });
	});

	it('streams the object with immutable cache headers', async () => {
		const bucket = makeBucket();
		bucket.get.mockResolvedValue({
			body: 'stream',
			httpEtag: '"abc"',
			httpMetadata: { contentType: 'image/png' }
		});

		const response = await mediaGET(makeMediaEvent({ bucket, key: 'uploads/x.png' }));

		expect(response.headers.get('Content-Type')).toBe('image/png');
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
		expect(response.headers.get('ETag')).toBe('"abc"');
	});

	it('returns 304 on a matching If-None-Match', async () => {
		const bucket = makeBucket();
		bucket.get.mockResolvedValue({
			body: 'stream',
			httpEtag: '"abc"',
			httpMetadata: { contentType: 'image/png' }
		});

		const response = await mediaGET(
			makeMediaEvent({ bucket, key: 'uploads/x.png', ifNoneMatch: '"abc"' })
		);

		expect(response.status).toBe(304);
	});
	describe('byte ranges', () => {
		const head = { size: 1000, httpEtag: '"v"', httpMetadata: { contentType: 'video/mp4' } };

		it('answers a range with 206 and the matching Content-Range', async () => {
			const bucket = makeBucket();
			bucket.head.mockResolvedValue(head);
			bucket.get.mockResolvedValue({ body: 'part' });

			const response = await mediaGET(
				makeMediaEvent({ bucket, key: 'uploads/c.mp4', range: 'bytes=0-99' })
			);

			expect(bucket.get).toHaveBeenCalledWith('uploads/c.mp4', {
				range: { offset: 0, length: 100 }
			});
			expect(response.status).toBe(206);
			expect(response.headers.get('Content-Range')).toBe('bytes 0-99/1000');
			expect(response.headers.get('Content-Length')).toBe('100');
			expect(response.headers.get('Content-Type')).toBe('video/mp4');
			expect(response.headers.get('ETag')).toBe('"v"');
		});

		it('defaults the type and omits the ETag when the object has neither', async () => {
			const bucket = makeBucket();
			bucket.head.mockResolvedValue({ size: 10 });
			bucket.get.mockResolvedValue({ body: 'part' });

			const response = await mediaGET(
				makeMediaEvent({ bucket, key: 'uploads/c.bin', range: 'bytes=-4' })
			);

			expect(response.headers.get('Content-Range')).toBe('bytes 6-9/10');
			expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
			expect(response.headers.get('ETag')).toBeNull();
		});

		it('416 for a range past the end', async () => {
			const bucket = makeBucket();
			bucket.head.mockResolvedValue(head);

			const response = await mediaGET(
				makeMediaEvent({ bucket, key: 'uploads/c.mp4', range: 'bytes=5000-' })
			);

			expect(response.status).toBe(416);
			expect(response.headers.get('Content-Range')).toBe('bytes */1000');
		});

		it('404 when the object is missing at head or at get', async () => {
			const bucket = makeBucket();
			bucket.head.mockResolvedValue(null);
			await expect(
				mediaGET(makeMediaEvent({ bucket, key: 'uploads/c.mp4', range: 'bytes=0-1' }))
			).rejects.toMatchObject({ status: 404 });

			bucket.head.mockResolvedValue(head);
			bucket.get.mockResolvedValue(null);
			await expect(
				mediaGET(makeMediaEvent({ bucket, key: 'uploads/c.mp4', range: 'bytes=0-1' }))
			).rejects.toMatchObject({ status: 404 });
		});

		it('serves the whole object for a range it does not honour', async () => {
			const bucket = makeBucket();
			bucket.head.mockResolvedValue(head);
			bucket.get.mockResolvedValue({ body: 'all', httpMetadata: { contentType: 'video/mp4' } });

			const response = await mediaGET(
				makeMediaEvent({ bucket, key: 'uploads/c.mp4', range: 'bytes=0-1,5-9' })
			);

			expect(response.status).toBe(200);
			expect(response.headers.get('Accept-Ranges')).toBe('bytes');
		});
	});
});
