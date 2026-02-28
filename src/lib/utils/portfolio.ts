/**
 * Shared portfolio utilities.
 *
 * Contains parsing logic used by both routes and the screenshot script.
 */

export interface ProjectMeta {
  url?: string;
  title: string;
  summary: string;
  technologies: string[];
  latestContribution?: string;
}

export interface Project {
  slug: string;
  meta: ProjectMeta;
  content: string;
}

/**
 * Convert a project URL into a safe screenshot filename path.
 * Matches the Deno Fresh version: strips protocol, replaces non-word chars with `_`, appends `.webp`.
 *
 * @example safeFilename("https://game.starspace.group") => "/portfolio-screenshot/game_starspace_group.webp"
 */
export function safeFilename(url: string): string {
  const name = url.replace(/https?:\/\//, '').replace(/\W+/g, '_') + '.webp';
  return '/portfolio-screenshot/' + name;
}

/**
 * Parse YAML-like frontmatter from markdown.
 * Handles CRLF line endings and multi-line arrays (with trailing commas).
 */
export function parseFrontmatter(markdown: string): { meta: Record<string, any>; content: string; } {
  // Normalize line endings to LF
  const normalized = markdown.replace(/\r\n/g, '\n');
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = normalized.match(frontmatterRegex);

  if (!match) {
    return { meta: {}, content: normalized };
  }

  const frontmatterText = match[1];
  const content = match[2];
  const meta: Record<string, any> = {};

  const lines = frontmatterText.split('\n');
  let currentKey: string | null = null;
  let currentValue: any = null;
  let collectingArray = false;
  let arrayLines: string[] = [];

  for (const line of lines) {
    if (collectingArray) {
      arrayLines.push(line.trim());
      if (line.trim().endsWith(']')) {
        const joined = arrayLines.join(' ');
        try {
          currentValue = JSON.parse(joined);
        } catch {
          const cleaned = joined.replace(/,\s*\]/g, ']');
          try {
            currentValue = JSON.parse(cleaned);
          } catch {
            currentValue = joined;
          }
        }
        collectingArray = false;
        arrayLines = [];
      }
      continue;
    }

    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) {
        meta[currentKey] = currentValue;
      }

      currentKey = keyMatch[1];
      const value = keyMatch[2].trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          currentValue = JSON.parse(value);
        } catch {
          currentValue = value;
        }
      } else if (value.startsWith('[')) {
        collectingArray = true;
        arrayLines = [value];
      } else if (value.startsWith('"') || value.startsWith("'")) {
        currentValue = value.slice(1, -1);
      } else {
        currentValue = value;
      }
    }
  }

  if (currentKey) {
    meta[currentKey] = currentValue;
  }

  return { meta, content };
}

/**
 * Build a Project object from raw parsed frontmatter.
 * Used by both the portfolio index and individual project routes.
 */
export function buildProject(slug: string, markdown: string): Project {
  const { meta, content } = parseFrontmatter(markdown);

  return {
    slug,
    meta: {
      title: meta.title || slug,
      summary: meta.summary || '',
      url: meta.url,
      technologies: meta.technologies || [],
      latestContribution: meta.latestContribution
    },
    content
  };
}
