import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Spotify Background Video Script answer-5 Source', () => {
  const scriptFile = path.join(
    process.cwd(),
    'scripts',
    'capture-spotify-background-video-answer-5-is-the-big-bang-theory-accurate.cjs'
  );

  it('should exist', () => {
    expect(existsSync(scriptFile)).toBe(true);
  });

  it('should target answer-5 hidden route and output file', () => {
    const source = readFileSync(scriptFile, 'utf8');

    expect(source).toContain('/hidden/spotify-background-video/answer-5-is-the-big-bang-theory-accurate');
    expect(source).toContain('spotify-background-vertical-answer-5-is-the-big-bang-theory-accurate.mp4');
  });

  it('should trigger the crow loop via custom event', () => {
    const source = readFileSync(scriptFile, 'utf8');

    expect(source).toContain('start-crow-loop');
  });
});