/**
 * Embed manifest — metadata for every Svelte component that can be embedded
 * in CMS richtext content. Deliberately free of .svelte imports so the
 * editor extension, sanitizer tests, and import scripts can use it anywhere
 * (Workers, Vitest, browser).
 *
 * The component map itself lives in ./index.ts.
 */

export interface EmbedDefinition {
	name: string;
	label: string;
	description: string;
	defaultProps: Record<string, unknown>;
}

export const embedManifest: EmbedDefinition[] = [
	{
		name: 'dirac-complex-plane',
		label: 'Dirac: Complex Plane Rotation',
		description: 'Interactive: i as a 90° rotation, draggable phase vector',
		defaultProps: {}
	},
	{
		name: 'dirac-equation',
		label: 'Dirac: The Equation',
		description: 'The Dirac equation with a pulsing glow and term labels',
		defaultProps: {}
	},
	{
		name: 'dirac-sea',
		label: 'Dirac: Sea & Pair Production',
		description: 'Interactive: the Dirac sea, click to create electron-positron pairs',
		defaultProps: {}
	},
	{
		name: 'dirac-belt-trick',
		label: 'Dirac: 720° Belt Trick',
		description: 'Interactive: spinor sign flip under rotation, drag to scrub',
		defaultProps: {}
	},
	{
		name: 'dirac-energy-momentum',
		label: 'Dirac: Energy-Momentum Dispersion',
		description: 'Interactive: E² = (pc)² + (mc²)² branches, drag to set momentum',
		defaultProps: {}
	},
	{
		name: 'dirac-zitterbewegung',
		label: 'Dirac: Zitterbewegung',
		description: 'The trembling motion of a free electron, with speed control',
		defaultProps: {}
	}
];

export function getEmbedDefinition(name: string): EmbedDefinition | undefined {
	return embedManifest.find((e) => e.name === name);
}
