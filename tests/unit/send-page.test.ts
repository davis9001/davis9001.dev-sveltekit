import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDiscordEmbed, clearRateLimitMap, isRateLimited } from '../../src/lib/utils/send';

// Mock the page store
vi.mock('$app/stores', () => ({
  page: readable({
    url: new URL('http://localhost/send'),
    params: {},
    route: { id: '/send' },
    status: 200,
    error: null,
    data: {},
    state: {},
    form: null
  })
}));

// Mock $app/forms
vi.mock('$app/forms', () => ({
  enhance: () => {
    return () => { };
  }
}));

describe('Send Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Load Function', () => {
    it('should return null user when not authenticated', async () => {
      const mockEvent = {
        locals: {},
        url: new URL('http://localhost:4220/send')
      };

      const { load } = await import('../../src/routes/send/+page.server');
      const result = await load(mockEvent as any);

      expect(result).toEqual({ user: null });
    });

    it('should return user data when authenticated', async () => {
      const mockUser = {
        id: 'test-user-id',
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/123456',
        isOwner: false,
        isAdmin: false
      };

      const mockEvent = {
        locals: { user: mockUser },
        url: new URL('http://localhost:4220/send')
      };

      const { load } = await import('../../src/routes/send/+page.server');
      const result = await load(mockEvent as any);

      expect(result).toEqual({ user: mockUser });
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      clearRateLimitMap();

      expect(isRateLimited('192.168.1.1')).toBe(false);
      expect(isRateLimited('192.168.1.1')).toBe(false);
      expect(isRateLimited('192.168.1.1')).toBe(false);
    });

    it('should block after 5 requests from same IP', async () => {
      clearRateLimitMap();

      const ip = '10.0.0.1';
      // First 5 should pass
      for (let i = 0; i < 5; i++) {
        expect(isRateLimited(ip)).toBe(false);
      }
      // 6th should be blocked
      expect(isRateLimited(ip)).toBe(true);
    });

    it('should not affect different IPs', async () => {
      clearRateLimitMap();

      // Max out one IP
      for (let i = 0; i < 5; i++) {
        isRateLimited('ip-a');
      }
      expect(isRateLimited('ip-a')).toBe(true);

      // A different IP should still be allowed
      expect(isRateLimited('ip-b')).toBe(false);
    });
  });

  describe('Discord Embed Builder', () => {
    it('should build embed without user', async () => {
      const result = buildDiscordEmbed(
        'Hello world',
        'John',
        'john@example.com',
        '1.2.3.4',
        'Mozilla/5.0',
        'en-US',
        'https://example.com',
        'https://davis9001.dev'
      );

      expect(result.embeds).toHaveLength(1);
      const embed = result.embeds[0];
      expect(embed.title).toBe('New Message from /send');
      expect(embed.description).toContain('Hello world');
      expect(embed.color).toBe(0x3b82f6);
      expect(embed.footer.text).toBe('davis9001.dev');
      expect(embed.author).toBeUndefined();
      expect(embed.thumbnail).toBeUndefined();

      // Check fields
      const fromField = embed.fields.find((f) => f.name === 'From');
      expect(fromField?.value).toBe('John');
      const contactField = embed.fields.find((f) => f.name === 'Contact');
      expect(contactField?.value).toBe('john@example.com');
      const ipField = embed.fields.find((f) => f.name === 'IP');
      expect(ipField?.value).toBe('1.2.3.4');
    });

    it('should build embed with anonymous defaults', async () => {
      const result = buildDiscordEmbed(
        'Test msg',
        undefined,
        undefined,
        'unknown',
        'unknown',
        'unknown',
        'none',
        'https://davis9001.dev'
      );

      const embed = result.embeds[0];
      const fromField = embed.fields.find((f) => f.name === 'From');
      expect(fromField?.value).toBe('_anonymous_');
      const contactField = embed.fields.find((f) => f.name === 'Contact');
      expect(contactField?.value).toBe('_not provided_');
    });

    it('should build embed with logged-in user', async () => {

      const user = {
        id: 'user-123',
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/123'
      };

      const result = buildDiscordEmbed(
        'Hello',
        'Test',
        'test@test.com',
        '1.2.3.4',
        'Mozilla/5.0',
        'en-US',
        'none',
        'https://davis9001.dev',
        user
      );

      const embed = result.embeds[0];
      expect(embed.author).toBeDefined();
      expect(embed.author?.name).toContain('@testuser');
      expect(embed.author?.url).toBe('https://github.com/testuser');
      expect(embed.author?.icon_url).toBe(user.avatarUrl);
      expect(embed.thumbnail?.url).toBe(user.avatarUrl);

      const ghField = embed.fields.find((f) => f.name === 'GitHub User');
      expect(ghField?.value).toContain('@testuser');
      const nameField = embed.fields.find((f) => f.name === 'Display Name');
      expect(nameField?.value).toBe('Test User');
      const idField = embed.fields.find((f) => f.name === 'User ID');
      expect(idField?.value).toBe('user-123');
    });

    it('should handle user without name or avatar', async () => {

      const user = {
        id: 'user-456',
        login: 'noname'
      };

      const result = buildDiscordEmbed(
        'Test',
        undefined,
        undefined,
        '1.1.1.1',
        'UA',
        'en',
        'none',
        'https://davis9001.dev',
        user
      );

      const embed = result.embeds[0];
      expect(embed.author?.name).toContain('noname (@noname)');
      expect(embed.author?.icon_url).toBe('');
      expect(embed.thumbnail?.url).toBe('');
      const nameField = embed.fields.find((f) => f.name === 'Display Name');
      expect(nameField?.value).toBe('_not set_');
    });
  });

  describe('Form Action', () => {
    it('should return error when message is empty', async () => {
      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', '');
      formData.set('name', 'Test');
      formData.set('contact', 'test@test.com');

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/webhook' } }
      };

      const result = await action(mockEvent as any);
      expect(result?.status).toBe(400);
      expect((result as any)?.data?.error).toBe('Please enter a message.');
    });

    it('should return error when message exceeds 2000 characters', async () => {
      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'x'.repeat(2001));
      formData.set('name', '');
      formData.set('contact', '');

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/webhook' } }
      };

      const result = await action(mockEvent as any);
      expect(result?.status).toBe(400);
      expect((result as any)?.data?.error).toBe(
        'Message must be 2000 characters or fewer.'
      );
    });

    it('should return error when DISCORD_WEBHOOK_URL is not configured', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'Test message');

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: {},
        platform: { env: {} }
      };

      const result = await action(mockEvent as any);
      expect(result?.status).toBe(500);
      expect((result as any)?.data?.error).toBe(
        'Messaging is not configured. Please try again later.'
      );
    });

    it('should return error when platform is undefined', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'Test message');

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: {},
        platform: undefined
      };

      const result = await action(mockEvent as any);
      expect(result?.status).toBe(500);
      expect((result as any)?.data?.error).toBe(
        'Messaging is not configured. Please try again later.'
      );
    });

    it('should send message successfully via Discord webhook', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'Hello from tests');
      formData.set('name', 'Tester');
      formData.set('contact', 'tester@example.com');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK'
      });
      globalThis.fetch = mockFetch;

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers({
            'user-agent': 'TestAgent/1.0',
            'accept-language': 'en-US,en;q=0.9',
            referer: 'http://localhost:4220/',
            'x-forwarded-for': '203.0.113.10'
          })
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' } }
      };

      const result = await action(mockEvent as any);
      expect(result).toEqual({ success: true });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://discord.com/api/webhooks/test');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.embeds[0].title).toBe('New Message from /send');
      expect(body.embeds[0].description).toContain('Hello from tests');
    });

    it('should send message with authenticated user info', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'Authenticated message');

      const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => 'OK' });
      globalThis.fetch = mockFetch;

      const mockUser = {
        id: 'user-99',
        login: 'autheduser',
        name: 'Authed User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/99',
        email: 'auth@example.com',
        isOwner: false
      };

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: { user: mockUser },
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' } }
      };

      const result = await action(mockEvent as any);
      expect(result).toEqual({ success: true });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const embed = body.embeds[0];
      expect(embed.author.name).toContain('@autheduser');
      const ghField = embed.fields.find((f: any) => f.name === 'GitHub User');
      expect(ghField.value).toContain('@autheduser');
    });

    it('should handle Discord webhook failure', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'This will fail');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });
      globalThis.fetch = mockFetch;

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' } }
      };

      const result = await action(mockEvent as any);
      expect(result?.status).toBe(502);
      expect((result as any)?.data?.error).toBe(
        'Failed to send message. Please try again.'
      );
    });

    it('should handle fetch network error', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'Network error test');

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      globalThis.fetch = mockFetch;

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' } }
      };

      const result = await action(mockEvent as any);
      expect(result?.status).toBe(502);
      expect((result as any)?.data?.error).toBe(
        'Failed to send message. Please try again.'
      );
    });

    it('should use cf-connecting-ip when x-forwarded-for is not present', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', 'CF IP test');

      const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => 'OK' });
      globalThis.fetch = mockFetch;

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers({
            'cf-connecting-ip': '198.51.100.5'
          })
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' } }
      };

      await action(mockEvent as any);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const ipField = body.embeds[0].fields.find((f: any) => f.name === 'IP');
      expect(ipField.value).toBe('198.51.100.5');
    });

    it('should return rate limit error when too many requests', async () => {
      clearRateLimitMap();

      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => 'OK' });
      globalThis.fetch = mockFetch;

      // Send 5 successful requests
      for (let i = 0; i < 5; i++) {
        const formData = new FormData();
        formData.set('message', `Message ${i}`);

        const mockEvent = {
          request: {
            formData: async () => formData,
            url: 'http://localhost:4220/send',
            headers: new Headers({
              'x-forwarded-for': '10.10.10.10'
            })
          },
          locals: {},
          platform: {
            env: { DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' }
          }
        };

        await action(mockEvent as any);
      }

      // 6th should be rate limited
      const formData = new FormData();
      formData.set('message', 'Rate limited message');

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers({
            'x-forwarded-for': '10.10.10.10'
          })
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' } }
      };

      const result = await action(mockEvent as any);
      expect(result?.status).toBe(429);
      expect((result as any)?.data?.error).toBe(
        'Too many messages. Please try again later.'
      );
    });

    it('should preserve name and contact in error responses', async () => {
      const mod = await import('../../src/routes/send/+page.server');
      const action = mod.actions.default;

      const formData = new FormData();
      formData.set('message', '');
      formData.set('name', 'Preserved Name');
      formData.set('contact', 'preserved@test.com');

      const mockEvent = {
        request: {
          formData: async () => formData,
          url: 'http://localhost:4220/send',
          headers: new Headers()
        },
        locals: {},
        platform: { env: { DISCORD_WEBHOOK_URL: 'https://discord.com/webhook' } }
      };

      const result = await action(mockEvent as any);
      expect((result as any)?.data?.name).toBe('Preserved Name');
      expect((result as any)?.data?.contact).toBe('preserved@test.com');
    });
  });

  describe('Send Page UI', () => {
    it('should display the page heading and subtitle', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      const { getByText } = render(SendPage.default, {
        props: {
          data: { user: null, hasAIProviders: false, hasAuthConfig: false },
          form: null
        }
      });

      expect(getByText('Send a Message')).toBeTruthy();
      expect(getByText('Have something to share? Send a message below.')).toBeTruthy();
    });

    it('should display the form fields', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      const { container } = render(SendPage.default, {
        props: {
          data: { user: null, hasAIProviders: false, hasAuthConfig: false },
          form: null
        }
      });

      const textarea = container.querySelector('textarea[name="message"]');
      expect(textarea).toBeTruthy();
      expect(textarea?.getAttribute('placeholder')).toBe('Type your message here...');

      const nameInput = container.querySelector('input[name="name"]');
      expect(nameInput).toBeTruthy();
      expect(nameInput?.getAttribute('placeholder')).toBe('Your name');

      const contactInput = container.querySelector('input[name="contact"]');
      expect(contactInput).toBeTruthy();
      expect(contactInput?.getAttribute('placeholder')).toBe(
        'Email, phone, or other way to reach you'
      );

      const submitBtn = container.querySelector('button[type="submit"]');
      expect(submitBtn).toBeTruthy();
      expect(submitBtn?.textContent?.trim()).toBe('Send Message');
    });

    it('should display success message', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      const { getByText, container } = render(SendPage.default, {
        props: {
          data: { user: null, hasAIProviders: false, hasAuthConfig: false },
          form: { success: true }
        }
      });

      expect(getByText('Message sent successfully!')).toBeTruthy();
      expect(getByText('Send another message')).toBeTruthy();

      // Form should not be visible
      const form = container.querySelector('form');
      expect(form).toBeNull();
    });

    it('should display error message with form still visible', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      const { getByText, container } = render(SendPage.default, {
        props: {
          data: { user: null, hasAIProviders: false, hasAuthConfig: false },
          form: { error: 'Please enter a message.' }
        }
      });

      expect(getByText('Please enter a message.')).toBeTruthy();

      // Form should still be visible
      const form = container.querySelector('form');
      expect(form).toBeTruthy();
    });

    it('should display user info when logged in', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      const mockUser = {
        id: 'user-1',
        login: 'testuser',
        email: 'test@test.com',
        name: 'Test User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1',
        isOwner: false
      };

      const { container, getByText } = render(SendPage.default, {
        props: {
          data: { user: mockUser, hasAIProviders: false, hasAuthConfig: false },
          form: null
        }
      });

      expect(getByText('Sending as')).toBeTruthy();
      expect(getByText('@testuser')).toBeTruthy();
      expect(getByText('(Test User)')).toBeTruthy();

      const avatar = container.querySelector('img[alt="testuser"]');
      expect(avatar).toBeTruthy();
      expect(avatar?.getAttribute('src')).toBe(
        'https://avatars.githubusercontent.com/u/1'
      );
    });

    it('should not display user section when not logged in', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      const { container } = render(SendPage.default, {
        props: {
          data: { user: null, hasAIProviders: false, hasAuthConfig: false },
          form: null
        }
      });

      const userInfo = container.querySelector('.user-info');
      expect(userInfo).toBeNull();
    });

    it('should have noindex meta tag', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      render(SendPage.default, {
        props: {
          data: { user: null, hasAIProviders: false, hasAuthConfig: false },
          form: null
        }
      });

      // svelte:head is injected into document.head
      const metaRobots = document.querySelector('meta[name="robots"]');
      expect(metaRobots?.getAttribute('content')).toBe('noindex, nofollow');
    });

    it('should display send another link on success', async () => {
      const SendPage = await import('../../src/routes/send/+page.svelte');

      const { container } = render(SendPage.default, {
        props: {
          data: { user: null, hasAIProviders: false, hasAuthConfig: false },
          form: { success: true }
        }
      });

      const link = container.querySelector('a[href="/send"]');
      expect(link).toBeTruthy();
      expect(link?.textContent).toBe('Send another message');
    });
  });
});
