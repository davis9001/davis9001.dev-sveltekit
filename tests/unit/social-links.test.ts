/**
 * Tests for SocialLinks component
 * Validates that all social media icons render correctly with Tabler Icons style
 * (stroke-based, multi-path SVGs matching the old Fresh site).
 */
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SocialLinks from '../../src/lib/components/SocialLinks.svelte';

describe('SocialLinks Component', () => {
  const expectedLinks = [
    { href: 'https://github.com/davis9001/', label: 'GitHub' },
    { href: 'https://discord.gg/KWfEvTF4NF', label: 'Discord' },
    { href: 'https://bsky.app/profile/davis9001.dev', label: 'Bluesky' },
    { href: 'https://mastodon.social/@davis9001', label: 'Mastodon' },
    { href: 'https://en.wikipedia.org/wiki/User:David_Monaghan', label: 'Wikipedia' },
    { href: 'https://x.com/williamonaghan', label: 'X/Twitter' },
    { href: 'https://www.linkedin.com/in/davidmonaghan/', label: 'LinkedIn' },
    {
      href: 'https://open.spotify.com/user/12810003?si=c67601d0640d4c9f',
      label: 'Spotify'
    },
    { href: 'https://soundcloud.com/davis9001', label: 'SoundCloud' },
    { href: 'https://www.instagram.com/davis9k1/', label: 'Instagram' },
    { href: 'https://sora.chatgpt.com/profile/davis9001', label: 'OpenAI' }
  ];

  it('should render all 11 social media links', () => {
    const { container } = render(SocialLinks);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(11);
  });

  it('should render each link with correct href and aria-label', () => {
    render(SocialLinks);
    for (const { href, label } of expectedLinks) {
      const link = screen.getByLabelText(label);
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe(href);
    }
  });

  it('should open links in new tab with security attributes', () => {
    const { container } = render(SocialLinks);
    const links = container.querySelectorAll('a');
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('should render SVGs with stroke-based Tabler Icons style (not filled)', () => {
    const { container } = render(SocialLinks);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(11);

    for (const svg of svgs) {
      expect(svg.getAttribute('fill')).toBe('none');
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.getAttribute('stroke-width')).toBe('2');
      expect(svg.getAttribute('stroke-linecap')).toBe('round');
      expect(svg.getAttribute('stroke-linejoin')).toBe('round');
    }
  });

  it('should render multi-path SVGs for icons that require them', () => {
    const { container } = render(SocialLinks);
    const svgs = container.querySelectorAll('svg');

    // Discord has 4 paths, Wikipedia has 6 paths, OpenAI has 6 paths
    const pathCounts: number[] = [];
    for (const svg of svgs) {
      pathCounts.push(svg.querySelectorAll('path').length);
    }

    // GitHub: 1, Discord: 4, Bluesky: 1, Mastodon: 2, Wikipedia: 6,
    // X: 2, LinkedIn: 5, Spotify: 4, SoundCloud: 4, Instagram: 3, OpenAI: 6
    expect(pathCounts).toEqual([1, 4, 1, 2, 6, 2, 5, 4, 4, 3, 6]);
  });

  it('should have viewBox="0 0 24 24" on all SVGs', () => {
    const { container } = render(SocialLinks);
    const svgs = container.querySelectorAll('svg');
    for (const svg of svgs) {
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    }
  });

  it('should render the Bluesky butterfly icon (not the old incorrect circle icon)', () => {
    const { container } = render(SocialLinks);
    const blueskyLink = screen.getByLabelText('Bluesky');
    const svg = blueskyLink.querySelector('svg');
    const path = svg?.querySelector('path');
    // The Bluesky butterfly path starts with the distinctive butterfly wing coordinates
    expect(path?.getAttribute('d')).toContain('6.335 5.144');
  });

  it('should render the Wikipedia W icon with line-based paths', () => {
    const { container } = render(SocialLinks);
    const wikiLink = screen.getByLabelText('Wikipedia');
    const svg = wikiLink.querySelector('svg');
    const paths = svg?.querySelectorAll('path');
    // Wikipedia icon has 6 stroke paths forming the W shape
    expect(paths?.length).toBe(6);
    // Check one of the distinctive W-forming paths
    const pathDs = Array.from(paths || []).map((p) => p.getAttribute('d'));
    expect(pathDs).toContain('M4 4.984l5.455 14.516l6.545 -14.516');
  });
});
