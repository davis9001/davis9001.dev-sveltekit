/**
 * Embed component registry — maps embed names to their Svelte components.
 * Imported only by client-rendering code paths (CmsContent); everything
 * that just needs metadata should import ./manifest instead.
 */

import type { ComponentType, SvelteComponent } from 'svelte';
import DiracBeltTrick from './dirac/DiracBeltTrick.svelte';
import DiracComplexPlane from './dirac/DiracComplexPlane.svelte';
import DiracEnergyMomentum from './dirac/DiracEnergyMomentum.svelte';
import DiracEquation from './dirac/DiracEquation.svelte';
import DiracSea from './dirac/DiracSea.svelte';
import DiracZitterbewegung from './dirac/DiracZitterbewegung.svelte';

const embedComponents: Record<string, ComponentType<SvelteComponent>> = {
	'dirac-complex-plane': DiracComplexPlane,
	'dirac-equation': DiracEquation,
	'dirac-sea': DiracSea,
	'dirac-belt-trick': DiracBeltTrick,
	'dirac-energy-momentum': DiracEnergyMomentum,
	'dirac-zitterbewegung': DiracZitterbewegung
};

export function getEmbedComponent(name: string): ComponentType<SvelteComponent> | null {
	return embedComponents[name] ?? null;
}
