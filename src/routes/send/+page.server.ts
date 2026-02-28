import { fail } from '@sveltejs/kit';
import { buildDiscordEmbed, isRateLimited } from '$lib/utils/send';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    user: locals.user || null
  };
};

export const actions: Actions = {
  default: async ({ request, locals, platform }) => {
    const form = await request.formData();
    const message = form.get('message')?.toString()?.trim();
    const name = form.get('name')?.toString()?.trim();
    const contact = form.get('contact')?.toString()?.trim();

    if (!message) {
      return fail(400, { error: 'Please enter a message.', name, contact });
    }

    if (message.length > 2000) {
      return fail(400, { error: 'Message must be 2000 characters or fewer.', name, contact });
    }

    // Gather request metadata
    const url = new URL(request.url);
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';

    // Rate limit check
    if (isRateLimited(ip)) {
      return fail(429, {
        error: 'Too many messages. Please try again later.',
        name,
        contact
      });
    }

    const DISCORD_WEBHOOK_URL = platform?.env?.DISCORD_WEBHOOK_URL;
    if (!DISCORD_WEBHOOK_URL) {
      console.error('DISCORD_WEBHOOK_URL not configured');
      return fail(500, {
        error: 'Messaging is not configured. Please try again later.',
        name,
        contact
      });
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'none';
    const lang = request.headers.get('accept-language')?.split(',')[0] || 'unknown';

    const body = buildDiscordEmbed(
      message,
      name,
      contact,
      ip,
      userAgent,
      lang,
      referer,
      url.origin,
      locals.user || undefined
    );

    try {
      const res = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        console.error('Discord webhook error:', res.status, await res.text());
        return fail(502, {
          error: 'Failed to send message. Please try again.',
          name,
          contact
        });
      }

      return { success: true };
    } catch (err) {
      console.error('Discord webhook error:', err);
      return fail(502, {
        error: 'Failed to send message. Please try again.',
        name,
        contact
      });
    }
  }
};
