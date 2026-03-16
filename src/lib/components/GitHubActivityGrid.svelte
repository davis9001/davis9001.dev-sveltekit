<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface ActivityDay {
		date: string;
		level: number; // 0-4 for intensity
		count: number;
		pmRatio: number; // 0.0 = all AM, 1.0 = all PM, -1 = no time data
	}

	export let initialData: ActivityDay[] | null = null;

	const NUM_WEEKS = 9;

	let activityData: ActivityDay[] = initialData ?? [];
	let loading = !initialData;
	let error: string | null = null;
	
	let lastFetchDate = '';
	let midnightTimer: ReturnType<typeof setTimeout> | null = null;

	function localDateKey(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function msUntilMidnight(): number {
		const now = new Date();
		const midnight = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() + 1,
			0,
			0,
			1
		);
		return midnight.getTime() - now.getTime();
	}

	async function fetchActivity() {
		const today = localDateKey();
		if (lastFetchDate === today && activityData.length > 0) return;

		try {
			const response = await fetch('/api/github-activity', {
				cache: 'no-store',
				headers: { 'Cache-Control': 'no-cache' }
			});
			
			if (!response.ok) throw new Error('Failed to fetch activity data');
			
			const data = await response.json();
			lastFetchDate = localDateKey();
			activityData = data;
			loading = false;
		} catch (err) {
			console.error('Error loading GitHub activity:', err);
			error = 'Failed to load activity data';
			loading = false;
		}
	}

	function scheduleMidnightRefresh() {
		if (midnightTimer) clearTimeout(midnightTimer);
		midnightTimer = setTimeout(() => {
			fetchActivity();
			scheduleMidnightRefresh();
		}, msUntilMidnight());
	}

	// Build weeks grid
	$: weeks = (() => {
		const weeksArray: (ActivityDay | null)[][] = [];
		const activityMap = new Map<string, ActivityDay>();
		
		activityData.forEach((day) => {
			activityMap.set(day.date, day);
		});

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayDayOfWeek = today.getDay();
		
		const currentWeekSunday = new Date(today);
		currentWeekSunday.setDate(today.getDate() - todayDayOfWeek);
		
		const startDate = new Date(currentWeekSunday);
		startDate.setDate(currentWeekSunday.getDate() - (NUM_WEEKS - 1) * 7);

		for (let weekIndex = 0; weekIndex < NUM_WEEKS; weekIndex++) {
			const week: (ActivityDay | null)[] = [];
			for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
				const date = new Date(startDate);
				date.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);
				
				const dateKey = date.toISOString().split('T')[0];
				
				if (date > today) {
					week.push(null);
				} else if (activityMap.has(dateKey)) {
					week.push(activityMap.get(dateKey)!);
				} else {
					week.push({ date: dateKey, level: 0, count: 0, pmRatio: -1 });
				}
			}
			weeksArray.push(week);
		}

		return weeksArray;
	})();

	$: activeDays = activityData.filter(d => d.count > 0).length;

	onMount(() => {
		// Initial fetch (refresh in background if we have SSR data, full fetch if not)
		fetchActivity();
		scheduleMidnightRefresh();

		// Visibility change handler
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				fetchActivity();
				scheduleMidnightRefresh();
			}
		};
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			if (midnightTimer) clearTimeout(midnightTimer);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});

	onDestroy(() => {
		if (midnightTimer) clearTimeout(midnightTimer);
	});

	const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
</script>

<div class="mt-6 w-full">
	<h3 class="text-xl sm:text-2xl font-black mb-4 flex items-center gap-2">
		<svg class="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
		</svg>
		<a
			href="https://github.com/davis9001"
			target="_blank"
			rel="noopener noreferrer"
			class="text-secondary hover:text-foreground transition-colors"
		>
			GitHub Activity
		</a>
	</h3>
	
	<div class="relative w-full p-3 sm:p-6 bg-gradient-to-br from-primary/5 via-background/50 to-accent/5 dark:from-primary/10 dark:via-background/70 dark:to-accent/10 rounded-2xl backdrop-blur-sm border border-foreground/5 shadow-lg">
		<div class="flex items-center justify-end mb-4">
			<span class="text-xs opacity-60">Last {NUM_WEEKS} weeks</span>
		</div>

		{#if loading}
			<div class="flex justify-center items-center py-12">
				<div class="flex flex-col items-center gap-2">
					<div class="animate-pulse flex space-x-1">
						<div class="h-2 w-2 bg-green-500 rounded-full animate-bounce"></div>
						<div class="h-2 w-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
						<div class="h-2 w-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.4s;"></div>
					</div>
					<span class="text-xs opacity-60">Loading activity...</span>
				</div>
			</div>
		{:else if error}
			<div class="flex justify-center items-center py-12">
				<span class="text-red-500 opacity-70 text-sm">{error}</span>
			</div>
		{:else}
			<div class="w-full">
				<div class="grid gap-1" style="grid-template-columns: auto repeat(9, 1fr);">
					{#each dayLabels as label, dayIndex}
						{@const isSunday = dayIndex === 0}
						{@const isSaturday = dayIndex === 6}
						
						<!-- Day label -->
						<div
							class="flex items-center justify-center text-[10px] sm:text-xs font-medium pr-1 {isSaturday ? 'opacity-60 text-red-500' : isSunday ? 'opacity-60 text-blue-500' : 'opacity-50'}"
							title={dayNames[dayIndex]}
						>
							{label}
						</div>

						<!-- Cells for this day across all weeks -->
						{#each weeks as week, weekIndex}
							{@const day = week[dayIndex]}
							
							{#if !day}
								<div class="aspect-square"></div>
							{:else}
								{@const date = new Date(day.date + 'T00:00:00Z')}
							
							<div
								class="aspect-square rounded-sm transition-all duration-300 hover:scale-110 cursor-pointer activity-level-{day.level} {isSaturday ? 'ring-1 ring-red-500/20 dark:ring-red-500/30' : isSunday ? 'ring-1 ring-blue-500/20 dark:ring-blue-500/30' : ''}"
									title="{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}: {day.count} {day.count === 1 ? 'contribution' : 'contributions'}"
								></div>
							{/if}
						{/each}
					{/each}
				</div>
			</div>

			<div class="flex items-center justify-between mt-6 pt-4 border-t border-foreground/5">
				<div class="flex items-center gap-2 text-xs">
					<span class="opacity-50">Less</span>
					<div class="flex gap-0.5">
						{#each [0, 1, 2, 3, 4] as level}
							<div
								class="w-2.5 h-2.5 rounded-sm activity-level-{level}"
								title={level === 0 ? 'No activity' : `Activity level ${level}`}
							></div>
						{/each}
					</div>
					<span class="opacity-50">More</span>
				</div>
				<div class="text-xs opacity-50">{activeDays} active days</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.activity-level-0 {
		background: var(--activity-0-bg);
		border: var(--activity-0-border);
	}
	.activity-level-1 {
		background: var(--activity-1-bg);
	}
	.activity-level-2 {
		background: var(--activity-2-bg);
	}
	.activity-level-3 {
		background: var(--activity-3-bg);
	}
	.activity-level-4 {
		background: var(--activity-4-bg);
	}
</style>
