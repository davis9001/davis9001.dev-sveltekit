import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Spotify Background Video Script 50,000 Source', () => {
  const scriptFile = path.join(
    process.cwd(),
    'scripts',
    'capture-spotify-background-video-50000.cjs'
  );

  it('should exist', () => {
    expect(existsSync(scriptFile)).toBe(true);
  });

  it('should target 50,000 hidden route and output file', () => {
    const source = readFileSync(scriptFile, 'utf8');

    expect(source).toContain('/hidden/spotify-background-video/50000');
    expect(source).toContain('spotify-background-vertical-50000.mp4');
  });

  it('should trigger the crow loop via custom event', () => {
    const source = readFileSync(scriptFile, 'utf8');

    expect(source).toContain('start-crow-loop');
  });
});
