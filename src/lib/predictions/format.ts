/** Human-readable formatting for a prediction's (optional) date window. */
export function formatDateWindow(
	start: string | null | undefined,
	end: string | null | undefined
): string {
	const fmt = (d: string) =>
		new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });

	if (start && end) return `Between ${fmt(start)} and ${fmt(end)}`;
	if (end) return `By ${fmt(end)}`;
	if (start) return `Sometime after ${fmt(start)}`;
	return '';
}
