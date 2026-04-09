<script lang="ts">
	import { onMount } from 'svelte';
	import GitHubActivityGrid from '$lib/components/GitHubActivityGrid.svelte';
	import SpotifyWidget from '$lib/components/SpotifyWidget.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import CrowMurder from '$lib/components/CrowMurder.svelte';
	import { formatBlogDate } from '$lib/utils/blog';
	import SEO from '$lib/components/SEO.svelte';
	import type { CrowTarget } from '$lib/utils/crow';
	import { computeContainedImageBounds, imageLandmarkToViewport, findTextNodeOffset, computeRowInkCounts, findGlyphLedges, findInkCenterInRow, computeRowInteriorGapCounts, findCounterBottoms, findInteriorGapCenter, derivePerchSpotsFromPretextLines, samplePerchSpotsFromRect, dedupePerchSpots, type TextCharAnchor, type RectPerchSamplingOptions } from '$lib/utils/crow';
	import { openCommandPalette } from '$lib/stores/commandPalette';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';

	$: isMac = browser && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

	export let data: PageData;

	$: recentPosts = data.recentPosts || [];
	$: githubActivityData = data.githubActivityData as any;
	$: spotifyData = data.spotifyData as any;

	let asciiCharacters: string[] = [];

	// Crow landing targets — positions relative to viewport
	// These are computed on mount and on resize to stay responsive
	let crowTargets: CrowTarget[] = [];

	/** Character perch spots for the murder of crows (positions on the title text) */
	let murderPerchSpots: Array<{ x: number; y: number }> = [];

	// Natural dimensions of /davis9001-2.webp (420 × 736)
	const IMG_NAT_W = 420;
	const IMG_NAT_H = 736;

	type PretextLine = { text: string };
	type PretextModule = {
		prepareWithSegments: (text: string, font: string, options?: { whiteSpace?: 'normal' | 'pre-wrap' }) => any;
		layoutWithLines: (prepared: any, maxWidth: number, lineHeight: number) => { lines: PretextLine[] };
	};

	let pretextModule: PretextModule | null = null;

	function parseLineHeightPx(raw: string, fontSizePx: number): number {
		if (raw === 'normal') return Math.round(fontSizePx * 1.2);
		const value = parseFloat(raw);
		return Number.isFinite(value) && value > 0 ? value : Math.round(fontSizePx * 1.2);
	}

	function collectElementPerchSpots(
		selector: string,
		options: RectPerchSamplingOptions = {}
	): Array<{ x: number; y: number }> {
		const spots: Array<{ x: number; y: number }> = [];
		for (const node of document.querySelectorAll(selector)) {
			if (!(node instanceof HTMLElement)) continue;
			const rect = node.getBoundingClientRect();
			if (rect.width < 8 || rect.height < 8) continue;
			spots.push(...samplePerchSpotsFromRect(rect, options));
		}
		return spots;
	}

	/**
	 * Measure the actual pixel offset of the background-position CSS
	 * (-9ch 18em) by creating an invisible measuring element.
	 * This ensures the crow positions track correctly regardless of
	 * the user's font size or zoom level.
	 */
	function measureBgOffset(): { offsetX: number; offsetY: number } {
		const measure = document.createElement('div');
		measure.style.cssText =
			'position:absolute;visibility:hidden;pointer-events:none;' +
			'width:9ch;height:18em;font:inherit';
		document.body.appendChild(measure);
		const chPx = measure.offsetWidth;   // 9ch in pixels
		const emPx = measure.offsetHeight;  // 18em in pixels
		document.body.removeChild(measure);
		return { offsetX: -chPx, offsetY: emPx };
	}

	function computeCrowTargets() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const targets: CrowTarget[] = [];
		const spots: Array<{ x: number; y: number }> = [];

		// ── Compute where the background photo actually renders ──
		// The background uses background-size:contain with offset -9ch 18em.
		// We measure the offset in real pixels, then compute exactly where the
		// contained image lands. Body landmarks are fractions *within the image*
		// so they track correctly at any viewport size or font setting.
		const { offsetX, offsetY } = measureBgOffset();
		const imgBounds = computeContainedImageBounds(
			vw, vh, IMG_NAT_W, IMG_NAT_H, offsetX, offsetY
		);

		// ── Body landmark coordinates ──
		// Fractions within the 420×736 source image.
		// The image extends well below the viewport (18em offset pushes it down),
		// so only the top ~73% is visible on a 1080p screen.
		//
		// Calibrated from debug dots — linear interpolation between two known points.
		// (iy=0.04 → ~13% viewport, iy=0.40 → ~95% viewport)

		// ── White halo / circle above head ──
		// Top of the white semicircle, centered on person.
		const halo = imageLandmarkToViewport(0.50, -0.01, imgBounds);
		targets.push({
			id: 'halo',
			x: halo.x,
			y: halo.y,
			scale: 1.56,
			zIndex: 35
		});

		// ── Right arm ──
		// Person's right arm (image left), raised to sunglasses.
		const rArm = imageLandmarkToViewport(0.32, 0.22, imgBounds);
		targets.push({
			id: 'right-arm',
			x: rArm.x,
			y: rArm.y,
			scale: 1.68,
			zIndex: 35
		});

		// ── Left arm ──
		// Person's left arm (image right), raised to sunglasses.
		const lArm = imageLandmarkToViewport(0.89, 0.19, imgBounds);
		targets.push({
			id: 'left-arm',
			x: lArm.x,
			y: lArm.y,
			scale: 1.68,
			flipX: true,
			zIndex: 35
		});

		// ── Right forearm (raised to sunglasses) ──
		const rForearm = imageLandmarkToViewport(0.12, 0.14, imgBounds);
		targets.push({
			id: 'right-forearm',
			x: rForearm.x,
			y: rForearm.y,
			scale: 1.2,
			zIndex: 35
		});

		// ── Left forearm (raised to sunglasses) ──
		const lForearm = imageLandmarkToViewport(0.83, 0.12, imgBounds);
		targets.push({
			id: 'left-forearm',
			x: lForearm.x,
			y: lForearm.y,
			scale: 1.2,
			flipX: true,
			zIndex: 35
		});

		// ── Logo — land on top edge of the logo image ──
		const logo = document.querySelector('.hero-logo');
		if (logo) {
			const rect = logo.getBoundingClientRect();
			targets.push({
				id: 'logo',
				x: rect.left + rect.width * 0.5,
				y: rect.top,
				scale: 0.4,
				zIndex: 45,
				anchorSelector: '.hero-logo',
				anchorAlign: { x: 0.5, y: 0 }
			});
		}

		// ── Title — land on a character in the "davis9001" text ──
		const title = document.querySelector('.hero-title');
		if (title) {
			const rect = title.getBoundingClientRect();
			// Land on a random character in the title text
			targets.push({
				id: 'title',
				x: rect.left + rect.width * 0.65,
				y: rect.top,
				scale: 0.35,
				zIndex: 45,
				anchorSelector: '.hero-title',
				anchorAlign: { x: 0.65, y: 0 },
				textAware: true
			});

			// ── Murder perch spots — find all horizontal ledges in each character ──
			// Render each character on an offscreen canvas and scan the pixel data
			// to find horizontal "ledges" — top edges of strokes where a crow can
			// perch. This produces multiple perch spots per character (e.g. the dot
			// and stem of "i", the loop of "9", crossbars, etc.).
			const charAnchors: TextCharAnchor[] = [];
			const textNodes: Text[] = [];
			const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
			let node: Text | null;
			while ((node = walker.nextNode() as Text | null)) {
				textNodes.push(node);
			}
			const nodeLengths = textNodes.map((n) => n.length);
			const fullText = title.textContent || '';

			// Set up canvas with the title's computed font for glyph scanning
			const titleStyle = getComputedStyle(title);
			const fontStr = `${titleStyle.fontWeight} ${titleStyle.fontSize} ${titleStyle.fontFamily}`;
			const fontSizePx = parseFloat(titleStyle.fontSize) || 16;
			const lineHeightPx = parseLineHeightPx(titleStyle.lineHeight, fontSizePx);
			const scanCanvas = document.createElement('canvas');
			const scanCtx = scanCanvas.getContext('2d');

			for (let ci = 0; ci < fullText.length; ci++) {
				if (/\s/.test(fullText[ci])) continue;
				const loc = findTextNodeOffset(nodeLengths, ci);
				if (!loc) continue;
				const tn = textNodes[loc.nodeIndex];
				const range = document.createRange();
				range.setStart(tn, loc.offset);
				range.setEnd(tn, Math.min(loc.offset + 1, tn.length));
				const cr = range.getBoundingClientRect();
				range.detach();
				charAnchors.push({ index: ci, x: cr.left + cr.width / 2, y: cr.top });

				if (!scanCtx) {
					// Fallback: just use bounding rect top
					spots.push({ x: cr.left + cr.width / 2, y: cr.top });
					continue;
				}

				// Render the character and scan for ledges
				scanCtx.font = fontStr;
				const metrics = scanCtx.measureText(fullText[ci]);
				const cw = Math.ceil(metrics.width) || 1;
				const ch =
					Math.ceil(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) || 1;
				scanCanvas.width = cw;
				scanCanvas.height = ch;
				scanCtx.font = fontStr; // must re-set after canvas resize
				scanCtx.fillStyle = '#000';
				scanCtx.fillText(fullText[ci], 0, metrics.fontBoundingBoxAscent);

				const imageData = scanCtx.getImageData(0, 0, cw, ch);
				const rowCounts = computeRowInkCounts(imageData.data, cw, ch);
				const ledges = findGlyphLedges(rowCounts, cw);

				// Also find counter bottoms (floors of holes in d, a, 9, 0, etc.)
				const gapCounts = computeRowInteriorGapCounts(imageData.data, cw, ch);
				const counterBottoms = findCounterBottoms(gapCounts, cw);

				if (ledges.length === 0 && counterBottoms.length === 0) {
					// No ledges or counters found — fall back to glyph top
					spots.push({ x: cr.left + cr.width / 2, y: cr.top });
					continue;
				}

				// Map each ledge from canvas coords to viewport coords
				const scaleX = cr.width / cw;
				const scaleY = cr.height / ch;
				for (const ledgeRow of ledges) {
					const inkCenter = findInkCenterInRow(imageData.data, cw, ledgeRow);
					if (inkCenter === null) continue;
					spots.push({
						x: cr.left + inkCenter * scaleX,
						y: cr.top + ledgeRow * scaleY
					});
				}

				// Map each counter bottom from canvas coords to viewport coords
				for (const bottomRow of counterBottoms) {
					const gapCenter = findInteriorGapCenter(imageData.data, cw, bottomRow);
					if (gapCenter === null) continue;
					spots.push({
						x: cr.left + gapCenter * scaleX,
						y: cr.top + bottomRow * scaleY
					});
				}
			}

			if (pretextModule) {
				try {
					const prepared = pretextModule.prepareWithSegments(fullText, fontStr, { whiteSpace: 'normal' });
					const layout = pretextModule.layoutWithLines(prepared, rect.width, lineHeightPx);
					const lineTexts = layout.lines.map((line) => line.text);
					const lineSpots = derivePerchSpotsFromPretextLines(fullText, charAnchors, lineTexts);
					spots.push(...lineSpots);
				} catch {
					// Keep legacy perch generation when Pretext is unavailable or fails.
				}
			}
		}

		// Add broader UI perches so the murder can land naturally across the page.
		spots.push(...collectElementPerchSpots('.hero-logo', { spacingPx: 80, minCount: 1, maxCount: 3, yOffsetPx: -2 }));
		spots.push(...collectElementPerchSpots('.hero-subtitle, .hero-role', { spacingPx: 78, minCount: 1, maxCount: 5, yOffsetPx: -1 }));
		spots.push(...collectElementPerchSpots('.hero-cta', { spacingPx: 54, minCount: 2, maxCount: 6, yOffsetPx: -2 }));
		spots.push(...collectElementPerchSpots('.cmd-palette-hint', { spacingPx: 48, minCount: 2, maxCount: 4, yOffsetPx: -2 }));
		spots.push(...collectElementPerchSpots('.hero-scroll-hint', { spacingPx: 20, minCount: 1, maxCount: 2, yOffsetPx: -2 }));
		spots.push(...collectElementPerchSpots('.content-card h2, .content-card h3', { spacingPx: 72, minCount: 1, maxCount: 6, yOffsetPx: -1 }));
		spots.push(...collectElementPerchSpots('.content-card a, .content-card button', { spacingPx: 62, minCount: 1, maxCount: 4, yOffsetPx: -2 }));

		murderPerchSpots = dedupePerchSpots(spots, 16, 220);

		// ── CTA — land on a character in the first CTA button ──
		const cta = document.querySelector('.hero-cta');
		if (cta) {
			const rect = cta.getBoundingClientRect();
			targets.push({
				id: 'cta',
				x: rect.left + rect.width * 0.5,
				y: rect.top,
				scale: 0.3,
				zIndex: 45,
				anchorSelector: '.hero-cta',
				anchorAlign: { x: 0.5, y: 0 },
				textAware: true
			});
		}

		// ── Scroll hint — land on the scroll chevron ──
		const scrollHint = document.querySelector('.hero-scroll-hint');
		if (scrollHint) {
			const rect = scrollHint.getBoundingClientRect();
			targets.push({
				id: 'scroll-hint',
				x: rect.left + rect.width * 0.5,
				y: rect.top,
				scale: 0.28,
				zIndex: 45,
				anchorSelector: '.hero-scroll-hint',
				anchorAlign: { x: 0.5, y: 0 }
			});
		}

		// ── Theme switcher — top-right corner ──
		// Theme switcher is z-50, crow sits just above it
		targets.push({
			id: 'theme-switcher',
			x: vw - 60,
			y: 40,
			scale: 0.3,
			zIndex: 51
		});

		crowTargets = targets;
	}

	onMount(() => {
		// Generate ASCII characters (same as Fresh site)
		const chars = [];
		for (let i = 42; i <= 4200; i++) {
			chars.push(String.fromCharCode(i));
		}
		asciiCharacters = chars;
		
		// Load ASCII animation script
		const script = document.createElement('script');
		script.src = '/ascii-animate.js';
		document.head.appendChild(script);

		void (async () => {
			try {
				const mod = await import('@chenglou/pretext');
				pretextModule = {
					prepareWithSegments: (text, font, options) => mod.prepareWithSegments(text, font, options),
					layoutWithLines: (prepared, maxWidth, lineHeight) => mod.layoutWithLines(prepared, maxWidth, lineHeight)
				};
			} catch {
				pretextModule = null;
			}
			computeCrowTargets();
		})();

		// Compute immediately too so the crow still has targets before the optional module resolves.
		computeCrowTargets();
		window.addEventListener('resize', computeCrowTargets);

		return () => {
			window.removeEventListener('resize', computeCrowTargets);
		};
	});
</script>

<SEO
	title="Home"
	description="The personal website of David Monaghan aka davis9001."
	path="/"
/>

<main class="relative text-foreground text-center bg-primary/5 dark:bg-primary/100">
	<!-- Theme Toggle (top-right) -->
	<div class="fixed top-0 right-0 m-4 z-50">
		<ThemeSwitcher variant="inline" simpleToggle={true} />
	</div>

	<!-- Animated Crow -->
	{#if crowTargets.length > 0}
		<AnimatedCrow
			targets={crowTargets}
			minIdleSeconds={6}
			maxIdleSeconds={14}
			flightDurationMs={2400}
			startingTargetId="right-arm"
		/>
		<CrowMurder targets={crowTargets} perchSpots={murderPerchSpots} />
	{/if}

	<!-- Background Image -->
	<div
		class="fixed inset-0 z-30 bg-cover bg-center bg-no-repeat"
		style="
			background-image: url('/davis9001-2.webp');
			background-size: contain;
			background-position: -9ch 18em;
		"
	/>

	<!-- ASCII Animation Grid -->
	<div class="fixed top-0 left-0 z-10 select-none font-mono items-center grid grid-cols-23 sm:grid-cols-42 lg:grid-cols-99 justify-center text-foreground text-center w-screen h-screen min-w-screen min-h-screen">
		{#each asciiCharacters as char}
			<div class="inline-block w-5 text-secondary ascii-character">
				{char}
			</div>
		{/each}
	</div>

	<!-- ===== HERO SECTION — Full viewport ===== -->
	<section class="hero-section relative z-40 min-h-screen flex flex-col items-center justify-center" role="banner">
		<div class="hero-content">
			<img
				class="hero-logo"
				src="/logo-green-Icon-250.webp"
				width="160"
				height="160"
				alt="the davis9001 logo: a 9 that roughly resembles a lowercase D, cut from a hexagon (not that anyone would notice)"
			/>

			<h1 class="hero-title">davis9001</h1>
			<p class="hero-subtitle">David "davis9001" Monaghan</p>
			<p class="hero-role">Software and Community Architect</p>

			<nav class="hero-ctas" aria-label="Quick links">
				<a href="https://starspace.group" class="hero-cta hero-cta--special">
					Currently building: *Space
				</a>
				<a href="/portfolio" class="hero-cta">
					Portfolio of Projects
				</a>
				<a href="/send" class="hero-cta">
					Send a message
				</a>
			</nav>

			<SocialLinks />

			<button class="cmd-palette-hint" on:click={openCommandPalette} aria-label="Open command palette">
				<kbd>{isMac ? '⌘' : 'Ctrl'}</kbd><span>+</span><kbd>K</kbd>
			</button>
		</div>

		<!-- Scroll hint -->
		<div class="hero-scroll-hint" aria-hidden="true">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</div>
	</section>

	<!-- ===== CONTENT — Below the fold ===== -->
	<section class="relative z-40 content-section" aria-label="Activity and updates">
		<div class="content-card bg-background/70 backdrop-blur-sm rounded-xl">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
				<div class="w-full flex flex-col gap-4 lg:gap-6">
					<GitHubActivityGrid initialData={githubActivityData} />

					<div class="w-full">
						<h3 class="text-xl sm:text-2xl font-black mb-4 flex items-center gap-2">
							<img
								src="/logo-green-Icon-250.webp"
								width="24"
								height="24"
								alt="davis9001 logo"
								class="w-5 h-5 sm:w-6 sm:h-6"
							/>
							<a
								href="/updates"
								class="text-secondary hover:text-foreground transition-colors"
							>
								Updates (Blog)
							</a>
						</h3>
						<div class="text-base sm:text-xl">
							{#each recentPosts as post}
								<div class="text-left p-2">
									<a href="/update/{post.slug}" class="text-accent">
										<em class="opacity-50">
											{formatBlogDate(post.publishedAt)}
										</em>
										- {post.title}
									</a>
								</div>
							{/each}
						</div>
						{#if recentPosts.length >= 5}
							<p class="text-left p-2">
								<a href="/updates" class="text-secondary">See the rest &rarr;</a>
							</p>
						{/if}
					</div>
				</div>

				<div class="w-full">
					<SpotifyWidget initialData={spotifyData} />
				</div>
			</div>

			<div class="mt-6">
				<Footer />
			</div>
		</div>
	</section>
</main>

<style>
	/* ── Hero Section ── */
	.hero-section {
		padding: 2rem 1rem 4rem;
	}

	.hero-content {
		max-width: 64rem;
		margin: 0 auto;
	}

	.hero-logo {
		margin: 0 auto 1.25rem;
		width: 96px;
		height: 96px;
		filter: drop-shadow(0 0 24px hsla(var(--accent), 0.35));
		transition: filter 300ms ease;
	}

	.hero-logo:hover {
		filter: drop-shadow(0 0 36px hsla(var(--accent), 0.55));
	}

	.hero-title {
		font-size: 3.5rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1;
		margin-bottom: 0.35rem;
		color: hsla(var(--foreground));
		text-shadow: 0 2px 30px hsla(var(--primary), 0.4);
	}

	.hero-subtitle {
		font-style: italic;
		color: hsla(var(--foreground), 0.65);
		font-size: 1rem;
		margin-bottom: 1.25rem;
		line-height: 1.4;
	}

	.hero-role {
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.3;
		margin-bottom: 2rem;
		color: hsla(var(--foreground), 0.9);
	}

	/* ── CTA Buttons ── */
	.hero-ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.625rem;
		justify-content: center;
		margin-bottom: 1.75rem;
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		padding: 0.7rem 1.35rem;
		border-radius: 0.5rem;
		background: hsla(var(--background), 0.45);
		color: hsla(var(--accent));
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 200ms ease;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid hsla(var(--foreground), 0.08);
	}

	.hero-cta:hover {
		background: hsla(var(--background), 0.7);
		transform: translateY(-2px);
		box-shadow: 0 8px 30px -8px hsla(var(--primary), 0.35);
		color: hsla(var(--accent));
		border-color: hsla(var(--accent), 0.2);
	}

	.hero-cta--special {
		color: hsla(var(--special));
		border-color: hsla(var(--special), 0.15);
	}

	.hero-cta--special:hover {
		border-color: hsla(var(--special), 0.3);
		box-shadow: 0 8px 30px -8px hsla(var(--special), 0.3);
		color: hsla(var(--special));
	}

	/* ── Command Palette Hint ── */
	.cmd-palette-hint {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		margin-top: 1.25rem;
		padding: 0.3rem 0.65rem;
		border-radius: 0.375rem;
		background: hsla(var(--foreground), 0.06);
		border: 1px solid hsla(var(--foreground), 0.1);
		color: hsla(var(--foreground), 0.4);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 200ms ease;
	}

	.cmd-palette-hint:hover {
		background: hsla(var(--foreground), 0.1);
		color: hsla(var(--foreground), 0.6);
		border-color: hsla(var(--foreground), 0.18);
	}

	.cmd-palette-hint kbd {
		font-family: inherit;
		font-size: 0.65rem;
		padding: 0.1rem 0.3rem;
		border-radius: 0.25rem;
		background: hsla(var(--foreground), 0.08);
		border: 1px solid hsla(var(--foreground), 0.12);
	}

	.cmd-palette-hint span {
		font-size: 0.6rem;
		opacity: 0.6;
	}

	/* ── Scroll Hint ── */
	.hero-scroll-hint {
		position: absolute;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		color: hsla(var(--foreground), 0.35);
		animation: hero-bob 2.5s ease-in-out infinite;
	}

	@keyframes hero-bob {
		0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.35; }
		50% { transform: translateX(-50%) translateY(10px); opacity: 0.6; }
	}

	/* ── Content Section ── */
	.content-section {
		padding: 0 0.5rem 2rem;
	}

	.content-card {
		max-width: 64rem;
		margin: 0 auto;
		padding: 1rem;
	}

	/* ═══ Tablet+ (768px) ═══ */
	@media (min-width: 768px) {
		.hero-logo {
			width: 148px;
			height: 148px;
			margin-bottom: 1.75rem;
		}

		.hero-title {
			font-size: 6rem;
			letter-spacing: -0.04em;
			margin-bottom: 0.5rem;
		}

		.hero-subtitle {
			font-size: 1.25rem;
			margin-bottom: 1.5rem;
		}

		.hero-role {
			font-size: 2rem;
			margin-bottom: 2.5rem;
		}

		.hero-ctas {
			gap: 0.875rem;
			margin-bottom: 2.25rem;
		}

		.hero-cta {
			font-size: 1rem;
			padding: 0.85rem 1.75rem;
		}

		.content-section {
			padding: 0 1rem 3rem;
		}

		.content-card {
			padding: 2.5rem;
		}
	}

	/* ═══ Desktop (1024px) ═══ */
	@media (min-width: 1024px) {
		.hero-title {
			font-size: 7.5rem;
		}

		.hero-role {
			font-size: 2.25rem;
		}

		.hero-cta {
			font-size: 1.05rem;
			padding: 0.9rem 2rem;
		}

		.content-card {
			padding: 3rem;
		}
	}

	/* ═══ Wide Desktop (1280px) ═══ */
	@media (min-width: 1280px) {
		.hero-title {
			font-size: 8.5rem;
		}
	}

	/* ═══ Small screens ═══ */
	@media (min-width: 400px) {
		.content-card {
			padding: 1.25rem;
		}
	}

	@media (min-width: 640px) {
		.content-section {
			padding: 0 1rem 2rem;
		}

		.content-card {
			padding: 2rem;
		}
	}
</style>
