import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Hidden Spotify Background Video Route davis Source', () => {
  const routeFile = path.join(
    process.cwd(),
    'src',
    'routes',
    'hidden',
    'spotify-background-video',
    'davis',
    '+page.svelte'
  );

  it('should exist', () => {
    expect(existsSync(routeFile)).toBe(true);
  });

  it('should include vertical background route davis marker', () => {
    const source = readFileSync(routeFile, 'utf8');

    expect(source).toContain('Hidden Spotify 9:16 background video route davis');
  });

  it('should avoid personal photo usage', () => {
    const source = readFileSync(routeFile, 'utf8');

    expect(source).not.toContain('davis9001-2.webp');
    expect(source).not.toContain('header-photo');
  });
});
