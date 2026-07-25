/**
 * Branch coverage for api/admin/users/[id]/+server.ts
 *
 * Complements admin-user-detail-api.test.ts, which covers the happy paths.
 * This file targets the guard clauses and error branches: auth rejection,
 * missing DB, self-modification guards, setup-owner protection, the
 * empty-update guard, normalizeStringField's clear-to-null path, the
 * runAllOrEmpty fallback for statements without .all(), and the legacy
 * discord-column fallback in PATCH.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ROUTE = '../../src/routes/api/admin/users/[id]/+server';

/** A prepare() mock whose statements answer first/all/run from a lookup table. */
function makeDB(handler: (sql: string) => any) {
	return { prepare: vi.fn((sql: string) => handler(sql)) };
}

function stmt(overrides: Record<string, any> = {}) {
	return {
		bind: vi.fn().mockReturnValue({
			first: vi.fn().mockResolvedValue(null),
			all: vi.fn().mockResolvedValue({ results: [] }),
			run: vi.fn().mockResolvedValue({ success: true }),
			...overrides
		})
	};
}

const adminLocals = { user: { id: 'admin-1', isOwner: true, isAdmin: true } };

function jsonRequest(body: unknown) {
	return new Request('http://localhost/api/admin/users/u1', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function expectStatus(promise: Promise<unknown>, status: number, message?: string) {
	try {
		await promise;
		expect.fail(`expected the handler to throw ${status}`);
	} catch (err: any) {
		expect(err.status).toBe(status);
		if (message !== undefined) {
			expect(err.body?.message ?? err.message).toContain(message);
		}
	}
}

describe('Admin User Detail API — branch coverage', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	describe('authorization guards', () => {
		it('GET rejects an unauthenticated caller', async () => {
			const { GET } = await import(ROUTE);
			await expectStatus(GET({ platform: {}, locals: {}, params: { id: 'u1' } } as any), 401);
		});

		it('GET rejects a caller who is neither owner nor admin', async () => {
			const { GET } = await import(ROUTE);
			await expectStatus(
				GET({
					platform: {},
					locals: { user: { id: 'u9', isOwner: false, isAdmin: false } },
					params: { id: 'u1' }
				} as any),
				403
			);
		});

		it('PATCH rejects an unauthenticated caller', async () => {
			const { PATCH } = await import(ROUTE);
			await expectStatus(
				PATCH({
					platform: {},
					locals: {},
					params: { id: 'u1' },
					request: jsonRequest({ name: 'x' })
				} as any),
				401
			);
		});

		it('PATCH rejects a caller who is neither owner nor admin', async () => {
			const { PATCH } = await import(ROUTE);
			await expectStatus(
				PATCH({
					platform: {},
					locals: { user: { id: 'u9', isOwner: false, isAdmin: false } },
					params: { id: 'u1' },
					request: jsonRequest({ name: 'x' })
				} as any),
				403
			);
		});

		it('DELETE rejects an unauthenticated caller', async () => {
			const { DELETE } = await import(ROUTE);
			await expectStatus(DELETE({ platform: {}, locals: {}, params: { id: 'u1' } } as any), 401);
		});

		it('DELETE rejects a caller who is neither owner nor admin', async () => {
			const { DELETE } = await import(ROUTE);
			await expectStatus(
				DELETE({
					platform: {},
					locals: { user: { id: 'u9', isOwner: false, isAdmin: false } },
					params: { id: 'u1' }
				} as any),
				403
			);
		});
	});

	describe('missing database', () => {
		it('GET surfaces a 500 when the binding is absent', async () => {
			const { GET } = await import(ROUTE);
			await expectStatus(
				GET({ platform: { env: {} }, locals: adminLocals, params: { id: 'u1' } } as any),
				500
			);
		});

		it('PATCH surfaces a 500 when the binding is absent', async () => {
			const { PATCH } = await import(ROUTE);
			await expectStatus(
				PATCH({
					platform: { env: {} },
					locals: adminLocals,
					params: { id: 'u1' },
					request: jsonRequest({ name: 'x' })
				} as any),
				500
			);
		});

		it('DELETE surfaces a 500 when the binding is absent', async () => {
			const { DELETE } = await import(ROUTE);
			await expectStatus(
				DELETE({ platform: { env: {} }, locals: adminLocals, params: { id: 'u1' } } as any),
				500
			);
		});
	});

	it('GET falls back to an empty result set when a statement has no all()', async () => {
		// runAllOrEmpty's guard: bind() returns an object without .all
		const db = makeDB((sql) => {
			if (sql.includes('FROM users')) {
				return stmt({
					first: vi.fn().mockResolvedValue({
						id: 'u1',
						email: 'user@example.com',
						name: 'User',
						is_admin: 0,
						github_login: null,
						github_avatar_url: null,
						discord_username: null,
						discord_avatar_url: null,
						created_at: '2026-01-01',
						updated_at: null
					})
				});
			}
			if (sql.startsWith('SELECT COUNT(*)')) {
				return stmt({ first: vi.fn().mockResolvedValue(null) });
			}
			// no `all` on the bound statement
			return { bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }) };
		});

		const { GET } = await import(ROUTE);
		const res = await GET({
			platform: { env: { DB: db } },
			locals: adminLocals,
			params: { id: 'u1' }
		} as any);
		const data = await res.json();

		expect(data.oauthAccounts).toEqual([]);
		expect(data.sessions).toEqual([]);
		expect(data.activityLogs).toEqual([]);
		// COUNT rows returned null — Number(undefined || 0) must land on 0
		expect(data.stats.totalSessions).toBe(0);
		expect(data.stats.totalChatMessages).toBe(0);
	});

	describe('PATCH guards', () => {
		const targetUser = {
			id: 'u1',
			email: 'user@example.com',
			github_login: 'userone',
			is_admin: 0
		};

		function dbWithTarget(user: any = targetUser) {
			return makeDB((sql) => {
				if (sql.startsWith('SELECT id, email, github_login, is_admin FROM users')) {
					return stmt({ first: vi.fn().mockResolvedValue(user) });
				}
				if (sql.includes('FROM users')) {
					return stmt({
						first: vi.fn().mockResolvedValue({
							...targetUser,
							name: 'User',
							github_avatar_url: null,
							discord_username: null,
							discord_avatar_url: null,
							created_at: '2026-01-01',
							updated_at: null
						})
					});
				}
				return stmt();
			});
		}

		it('returns 404 when the target user is absent', async () => {
			const { PATCH } = await import(ROUTE);
			await expectStatus(
				PATCH({
					platform: { env: { DB: dbWithTarget(null) } },
					locals: adminLocals,
					params: { id: 'u1' },
					request: jsonRequest({ name: 'New' })
				} as any),
				404
			);
		});

		it('refuses to change the caller’s own admin status', async () => {
			const { PATCH } = await import(ROUTE);
			await expectStatus(
				PATCH({
					platform: { env: { DB: dbWithTarget({ ...targetUser, id: 'admin-1' }) } },
					locals: adminLocals,
					params: { id: 'admin-1' },
					request: jsonRequest({ isAdmin: false })
				} as any),
				400,
				'Cannot modify your own admin status'
			);
		});

		it('refuses to demote the setup owner', async () => {
			const { PATCH } = await import(ROUTE);
			await expectStatus(
				PATCH({
					platform: {
						env: {
							DB: dbWithTarget(),
							KV: {
								get: vi.fn().mockResolvedValue(JSON.stringify({ ownerEmail: 'user@example.com' }))
							}
						}
					},
					locals: adminLocals,
					params: { id: 'u1' },
					request: jsonRequest({ isAdmin: false })
				} as any),
				400,
				'Cannot demote the setup owner'
			);
		});

		it('rejects a body with no supported fields', async () => {
			const { PATCH } = await import(ROUTE);
			await expectStatus(
				PATCH({
					platform: { env: { DB: dbWithTarget() } },
					locals: adminLocals,
					params: { id: 'u1' },
					request: jsonRequest({ nickname: 42 })
				} as any),
				400,
				'No supported fields provided'
			);
		});

		it('clears a field when given a blank string', async () => {
			const run = vi.fn().mockResolvedValue({ success: true });
			const db = makeDB((sql) => {
				if (sql.startsWith('SELECT id, email, github_login, is_admin FROM users')) {
					return stmt({ first: vi.fn().mockResolvedValue(targetUser) });
				}
				if (sql.startsWith('UPDATE users SET')) {
					return { bind: vi.fn().mockReturnValue({ run }) };
				}
				if (sql.includes('FROM users')) {
					return stmt({
						first: vi.fn().mockResolvedValue({
							...targetUser,
							name: null,
							github_avatar_url: null,
							discord_username: null,
							discord_avatar_url: null,
							created_at: '2026-01-01',
							updated_at: null
						})
					});
				}
				return stmt();
			});

			const { PATCH } = await import(ROUTE);
			const res = await PATCH({
				platform: { env: { DB: db } },
				locals: adminLocals,
				params: { id: 'u1' },
				request: jsonRequest({ name: '   ' })
			} as any);

			expect(res.status).toBe(200);
			// normalizeStringField turns a whitespace-only string into an explicit null
			expect(run).toHaveBeenCalled();
			const boundValues = (db.prepare as any).mock.results
				.map((r: any) => r.value)
				.filter((v: any) => v?.bind?.mock?.calls?.length)
				.flatMap((v: any) => v.bind.mock.calls[0]);
			expect(boundValues).toContain(null);
		});

		it('reports a demotion when only isAdmin changes', async () => {
			const db = makeDB((sql) => {
				if (sql.startsWith('SELECT id, email, github_login, is_admin FROM users')) {
					return stmt({ first: vi.fn().mockResolvedValue({ ...targetUser, is_admin: 1 }) });
				}
				if (sql.includes('FROM users')) {
					return stmt({
						first: vi.fn().mockResolvedValue({
							...targetUser,
							name: 'User',
							github_avatar_url: null,
							discord_username: null,
							discord_avatar_url: null,
							created_at: '2026-01-01',
							updated_at: null
						})
					});
				}
				return stmt();
			});

			const { PATCH } = await import(ROUTE);
			const res = await PATCH({
				platform: { env: { DB: db } },
				locals: adminLocals,
				params: { id: 'u1' },
				request: jsonRequest({ isAdmin: false })
			} as any);

			const data = await res.json();
			expect(data.success).toBe(true);
			expect(data.message).toBe('User demoted from admin');
		});

		it('retries against the legacy schema when discord columns are missing', async () => {
			let sawLegacySelect = false;
			const db = makeDB((sql) => {
				if (sql.startsWith('SELECT id, email, github_login, is_admin FROM users')) {
					return stmt({ first: vi.fn().mockResolvedValue(targetUser) });
				}
				if (sql.startsWith('UPDATE users SET') && sql.includes('discord_username')) {
					return {
						bind: vi.fn().mockReturnValue({
							run: vi.fn().mockRejectedValue(new Error('no such column: discord_username'))
						})
					};
				}
				if (sql.startsWith('UPDATE users SET')) {
					return { bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) }) };
				}
				if (sql.includes('NULL as discord_username')) {
					sawLegacySelect = true;
					return stmt({
						first: vi.fn().mockResolvedValue({
							...targetUser,
							name: 'User',
							github_avatar_url: null,
							discord_username: null,
							discord_avatar_url: null,
							created_at: '2026-01-01',
							updated_at: null
						})
					});
				}
				return stmt();
			});

			const { PATCH } = await import(ROUTE);
			const res = await PATCH({
				platform: { env: { DB: db } },
				locals: adminLocals,
				params: { id: 'u1' },
				// The body must carry a non-discord field too: on the legacy retry the
				// discord columns are skipped, so a discord-only body would produce
				// zero update clauses and fail with "No supported fields provided".
				request: jsonRequest({ name: 'New Name', discordUsername: 'newhandle' })
			} as any);

			const data = await res.json();
			expect(data.success).toBe(true);
			expect(sawLegacySelect).toBe(true);
		});
	});

	describe('DELETE guards', () => {
		it('refuses to delete the caller’s own account', async () => {
			const { DELETE } = await import(ROUTE);
			await expectStatus(
				DELETE({
					platform: { env: { DB: makeDB(() => stmt()) } },
					locals: adminLocals,
					params: { id: 'admin-1' }
				} as any),
				400,
				'Cannot delete your own account'
			);
		});

		it('returns 404 when the target user is absent', async () => {
			const { DELETE } = await import(ROUTE);
			await expectStatus(
				DELETE({
					platform: { env: { DB: makeDB(() => stmt()) } },
					locals: adminLocals,
					params: { id: 'u1' }
				} as any),
				404
			);
		});

		it('refuses to delete the setup owner', async () => {
			const db = makeDB((sql) => {
				if (sql.startsWith('SELECT id, email FROM users')) {
					return stmt({
						first: vi.fn().mockResolvedValue({ id: 'u1', email: 'owner@example.com' })
					});
				}
				return stmt();
			});

			const { DELETE } = await import(ROUTE);
			await expectStatus(
				DELETE({
					platform: {
						env: {
							DB: db,
							KV: {
								get: vi.fn().mockResolvedValue(JSON.stringify({ ownerEmail: 'owner@example.com' }))
							}
						}
					},
					locals: adminLocals,
					params: { id: 'u1' }
				} as any),
				400,
				'Cannot delete the setup owner'
			);
		});

		it('deletes a non-owner user', async () => {
			const run = vi.fn().mockResolvedValue({ success: true });
			const db = makeDB((sql) => {
				if (sql.startsWith('SELECT id, email FROM users')) {
					return stmt({
						first: vi.fn().mockResolvedValue({ id: 'u1', email: 'user@example.com' })
					});
				}
				if (sql.startsWith('DELETE FROM users')) {
					return { bind: vi.fn().mockReturnValue({ run }) };
				}
				return stmt();
			});

			const { DELETE } = await import(ROUTE);
			const res = await DELETE({
				platform: {
					env: {
						DB: db,
						KV: {
							get: vi.fn().mockResolvedValue(JSON.stringify({ ownerEmail: 'owner@example.com' }))
						}
					}
				},
				locals: adminLocals,
				params: { id: 'u1' }
			} as any);

			const data = await res.json();
			expect(data.success).toBe(true);
			expect(run).toHaveBeenCalled();
		});

		it('wraps an unexpected database failure as a 500', async () => {
			const db = makeDB(() => {
				throw new Error('connection lost');
			});

			const { DELETE } = await import(ROUTE);
			await expectStatus(
				DELETE({
					platform: { env: { DB: db } },
					locals: adminLocals,
					params: { id: 'u1' }
				} as any),
				500
			);
		});
	});
});
