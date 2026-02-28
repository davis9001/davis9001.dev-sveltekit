// Rate limiting: max 5 messages per 15 minutes per IP
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>();

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  rateLimitMap.set(ip, recent);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export function clearRateLimitMap(): void {
  rateLimitMap.clear();
}

// Clean up stale entries every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitMap) {
      const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
      if (recent.length === 0) rateLimitMap.delete(ip);
      else rateLimitMap.set(ip, recent);
    }
  }, 30 * 60 * 1000);
}

interface DiscordEmbed {
  title: string;
  description: string;
  fields: { name: string; value: string; inline: boolean; }[];
  color: number;
  timestamp: string;
  footer: { text: string; };
  author?: { name: string; url: string; icon_url: string; };
  thumbnail?: { url: string; };
}

export function buildDiscordEmbed(
  message: string,
  name: string | undefined,
  contact: string | undefined,
  ip: string,
  userAgent: string,
  lang: string,
  referer: string,
  origin: string,
  user?: { login: string; name?: string; avatarUrl?: string; id: string; }
): { embeds: [DiscordEmbed]; } {
  const timestamp = new Date().toISOString();

  const fields: { name: string; value: string; inline: boolean; }[] = [
    { name: 'From', value: name || '_anonymous_', inline: true },
    { name: 'Contact', value: contact || '_not provided_', inline: true },
    { name: 'IP', value: ip, inline: true }
  ];

  if (user) {
    fields.push(
      {
        name: 'GitHub User',
        value: `[@${user.login}](https://github.com/${user.login})`,
        inline: true
      },
      { name: 'Display Name', value: user.name || '_not set_', inline: true },
      { name: 'User ID', value: user.id, inline: true }
    );
  }

  fields.push(
    { name: 'User-Agent', value: userAgent, inline: false },
    { name: 'Language', value: lang, inline: true },
    { name: 'Referer', value: referer, inline: true },
    { name: 'Origin', value: origin, inline: true }
  );

  const embed: DiscordEmbed = {
    title: 'New Message from /send',
    description: `\`\`\`\n${message}\n\`\`\``,
    fields,
    color: 0x3b82f6,
    timestamp,
    footer: { text: 'davis9001.dev' }
  };

  if (user) {
    embed.author = {
      name: `${user.name || user.login} (@${user.login})`,
      url: `https://github.com/${user.login}`,
      icon_url: user.avatarUrl || ''
    };
    embed.thumbnail = { url: user.avatarUrl || '' };
  }

  return { embeds: [embed] };
}
