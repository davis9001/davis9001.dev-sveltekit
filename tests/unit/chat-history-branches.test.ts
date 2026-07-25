/**
 * Branch coverage for lib/stores/chatHistory.ts
 *
 * Complements chat-history.test.ts / chat-history-errors.test.ts. Targets the
 * remaining guards: the anonymous storage-key path, loading with nothing in
 * storage, the no-current-conversation fallbacks on both the imperative API
 * and the derived stores, and updateMessage's non-matching-id arm plus its
 * optional cost spread.
 */
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatHistoryStore, currentConversation, currentMessages } from '$lib/stores/chatHistory';

const PREFIX = 'davis9001_chat_history';

/** In-memory localStorage double — happy-dom's implementation is partial. */
function installStorage() {
	const store = new Map<string, string>();
	const mock = {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => void store.set(k, String(v)),
		removeItem: (k: string) => void store.delete(k),
		clear: () => store.clear(),
		key: (i: number) => [...store.keys()][i] ?? null,
		get length() {
			return store.size;
		}
	};
	vi.stubGlobal('localStorage', mock);
	return store;
}

describe('chatHistory store — branch coverage', () => {
	let storage: Map<string, string>;

	beforeEach(() => {
		storage = installStorage();
		chatHistoryStore.reset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses the unsuffixed storage key when there is no user', () => {
		// getStorageKey's !userId arm. reset() leaves userId null, and
		// saveToStorage bails without a user, so nothing should be written.
		chatHistoryStore.createConversation('anon');
		expect(storage.get(PREFIX)).toBeUndefined();
		expect(storage.size).toBe(0);
	});

	it('starts from a clean state when storage holds nothing for the user', () => {
		// loadFromStorage's `if (stored)` false arm.
		chatHistoryStore.initializeForUser('fresh-user');
		const state = get(chatHistoryStore);
		expect(state.conversations).toEqual([]);
		expect(state.currentConversationId).toBeNull();
		expect(state.userId).toBe('fresh-user');
	});

	it('restores a persisted conversation for a returning user', () => {
		// Seed storage directly rather than round-tripping through reset():
		// reset() preserves userId, so the persist subscription immediately
		// writes the empty state back and wipes what we just saved.
		storage.set(
			`${PREFIX}_returning`,
			JSON.stringify({
				conversations: [
					{
						id: 'conv-1',
						title: 'Persisted',
						createdAt: '2026-07-01T10:00:00.000Z',
						updatedAt: '2026-07-01T10:05:00.000Z',
						messages: [
							{
								id: 'msg-1',
								role: 'user',
								content: 'hello',
								timestamp: '2026-07-01T10:01:00.000Z'
							}
						]
					}
				],
				currentConversationId: 'conv-1',
				isLoading: false,
				isSidebarOpen: true,
				userId: 'returning'
			})
		);

		// The `if (stored)` true arm plus the date-revival mapping.
		chatHistoryStore.initializeForUser('returning');

		const state = get(chatHistoryStore);
		expect(state.conversations).toHaveLength(1);
		expect(state.conversations[0].id).toBe('conv-1');
		expect(state.conversations[0].createdAt).toBeInstanceOf(Date);
		expect(state.conversations[0].messages[0].timestamp).toBeInstanceOf(Date);
	});

	it('returns no messages when nothing is selected', () => {
		// getCurrentMessages -> conversation?.messages || []
		expect(chatHistoryStore.getCurrentMessages()).toEqual([]);
	});

	it('returns no current conversation when nothing is selected', () => {
		// getCurrentConversation -> ... || null
		expect(chatHistoryStore.getCurrentConversation()).toBeNull();
	});

	it('derived stores fall back to null/empty with no selection', () => {
		expect(get(currentConversation)).toBeNull();
		expect(get(currentMessages)).toEqual([]);
	});

	it('derived stores follow the selected conversation', () => {
		chatHistoryStore.initializeForUser('derived-user');
		const conv = chatHistoryStore.createConversation('Derived');
		chatHistoryStore.addMessage(conv.id, { role: 'user', content: 'ping' });

		expect(get(currentConversation)?.id).toBe(conv.id);
		expect(get(currentMessages)).toHaveLength(1);
	});

	it('leaves other messages untouched when updating one by id', () => {
		chatHistoryStore.initializeForUser('update-user');
		const conv = chatHistoryStore.createConversation('Updates');
		const first = chatHistoryStore.addMessage(conv.id, { role: 'user', content: 'first' });
		const second = chatHistoryStore.addMessage(conv.id, {
			role: 'assistant',
			content: 'second'
		});

		// The ternary's false arm: msg.id !== messageId leaves the message as-is.
		chatHistoryStore.updateMessage(conv.id, second.id, 'second edited');

		const messages = chatHistoryStore.getCurrentMessages();
		expect(messages.find((m) => m.id === first.id)?.content).toBe('first');
		expect(messages.find((m) => m.id === second.id)?.content).toBe('second edited');
	});

	it('attaches cost only when one is supplied', () => {
		chatHistoryStore.initializeForUser('cost-user');
		const conv = chatHistoryStore.createConversation('Costs');
		const plain = chatHistoryStore.addMessage(conv.id, { role: 'assistant', content: 'a' });
		const priced = chatHistoryStore.addMessage(conv.id, { role: 'assistant', content: 'b' });

		// `...(cost && { cost })` — omitted on one call, present on the other.
		chatHistoryStore.updateMessage(conv.id, plain.id, 'a edited');
		chatHistoryStore.updateMessage(conv.id, priced.id, 'b edited', {
			totalCost: 0.01,
			inputTokens: 10,
			outputTokens: 20
		} as any);

		const messages = chatHistoryStore.getCurrentMessages();
		expect(messages.find((m) => m.id === plain.id)?.cost).toBeUndefined();
		expect(messages.find((m) => m.id === priced.id)?.cost).toBeDefined();
	});
});
