/**
 * Shared portfolio utilities.
 *
 * Contains parsing logic used by both routes and the screenshot script.
 */

import { THEME_VARIANTS, type ThemeVariant } from './theme-image';

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

export type ScreenshotTheme = ThemeVariant;

/** Re-exported so callers rendering a screenshot pair need only this module. */
export const SCREENSHOT_THEMES = THEME_VARIANTS;

/** Origin used for absolute social-card URLs. */
const SITE_ORIGIN = 'https://davis9001.dev';

/**
 * Filename stem for a project's screenshots, derived from its URL.
 * Strips the protocol and replaces every run of non-word characters with `_`.
 *
 * @example screenshotStem("https://game.starspace.group") => "game_starspace_group"
 */
export function screenshotStem(url: string): string {
  return url.replace(/https?:\/\//, '').replace(/\W+/g, '_');
}

/**
 * Site-relative path to one theme's screenshot. Every project has both, so
 * callers can render the pair and let CSS pick by `data-theme`.
 *
 * @example screenshotPath("https://game.starspace.group", "dark")
 *   => "/portfolio-screenshot/game_starspace_group-dark.webp"
 */
export function screenshotPath(url: string, theme: ScreenshotTheme): string {
  return `/portfolio-screenshot/${screenshotStem(url)}-${theme}.webp`;
}

/**
 * Absolute screenshot URL for social cards. A crawler has no theme to follow,
 * so this always resolves to the dark capture.
 */
export function screenshotOgUrl(url: string): string {
  return SITE_ORIGIN + screenshotPath(url, 'dark');
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
