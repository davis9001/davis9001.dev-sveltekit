<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface SpotifyTrack {
		id: string;
		name: string;
		artists: { name: string; external_urls: { spotify: string } }[];
		album: {
			name: string;
			images: { url: string; height: number; width: number }[];
			external_urls: { spotify: string };
		};
		external_urls: { spotify: string };
		duration_ms: number;
	}

	interface SpotifyData {
		currentlyPlaying: {
			isPlaying: boolean;
			track: SpotifyTrack | null;
			progress_ms: number;
			context: {
				type: string;
				name: string;
				url: string;
			} | null;
		} | null;
		recentlyPlayed: Array<{
			track: SpotifyTrack;
			playedAt: string;
		}>;
		topPlaylists: Array<{
			id: string;
			name: string;
			description: string;
			imageUrl: string | null;
			url: string;
			trackCount: number;
			followers: number;
			totalDurationMs: number;
		}>;
		profileUrl: string;
		error?: string;
	}

	/** Optional initial data for SSR/testing — skips fetch when provided */
	export let initialData: SpotifyData | null = null;

	let spotifyData: SpotifyData | null = initialData;
	let loading = !initialData;
	let error: string | null = initialData?.error ? initialData.error : null;
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	function formatRelativeTime(timestamp: string): string {
		const now = new Date();
		const played = new Date(timestamp);
		const diffMs = now.getTime() - played.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	}

	async function fetchSpotifyData() {
		try {
			const response = await fetch('/api/spotify');
			if (!response.ok) {
				throw new Error('Failed to fetch Spotify data');
			}
			const data = await response.json();
			spotifyData = data;
			loading = false;
		} catch (err) {
			console.error('Error loading Spotify data:', err);
			error = 'Failed to load Spotify data';
			loading = false;
		}
	}

	async function refreshData() {
		try {
			const response = await fetch('/api/spotify');
			if (response.ok) {
				const data = await response.json();
				spotifyData = data;
			}
		} catch (err) {
			console.error('Error refreshing Spotify data:', err);
		}
	}

	onMount(() => {
		// Skip initial fetch if data was provided via props
		if (!initialData) {
			fetchSpotifyData();
		}
	});

	$: profileUrl = spotifyData?.profileUrl || 'https://open.spotify.com/user/12810003?si=7ba6ee05f9cb4e96';
	$: currentlyPlaying = spotifyData?.currentlyPlaying;
	$: recentlyPlayed = spotifyData?.recentlyPlayed || [];
	$: topPlaylists = spotifyData?.topPlaylists || [];
	$: showNoActivity = !currentlyPlaying?.isPlaying && recentlyPlayed.length === 0 && topPlaylists.length === 0;
</script>

<div class="mt-6 w-full max-w-screen-sm">
	<h3 class="text-xl sm:text-2xl font-black mb-4 flex items-center gap-2">
		<svg
			class="w-5 h-5 sm:w-6 sm:h-6 text-green-500"
			viewBox="0 0 24 24"
			fill="currentColor"
		>
			<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
		</svg>
		<a
			href={profileUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="text-secondary hover:text-green-500 transition-colors"
		>
			Spotify
		</a>
	</h3>

	{#if loading}
		<div class="text-center p-6 bg-gradient-to-br from-primary/5 via-background/50 to-accent/5 dark:from-primary/10 dark:via-background/70 dark:to-accent/10 rounded-2xl backdrop-blur-sm border border-foreground/5 shadow-lg">
			<p class="text-foreground/70">Loading Spotify data...</p>
		</div>
	{:else if error || spotifyData?.error}
		<div class="text-center p-6 bg-gradient-to-br from-primary/5 via-background/50 to-accent/5 dark:from-primary/10 dark:via-background/70 dark:to-accent/10 rounded-2xl backdrop-blur-sm border border-foreground/5 shadow-lg">
			<p class="text-foreground/70">Unable to load Spotify data. Check back later!</p>
		</div>
	{:else}
		<!-- Currently Playing -->
		{#if currentlyPlaying?.isPlaying && currentlyPlaying.track}
			<div class="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-green-600/20 dark:from-green-700/30 dark:to-green-800/30 rounded-lg border-2 border-green-500/50 shadow-lg">
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-1">
						<svg
							class="w-5 h-5 text-green-500 animate-pulse"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
						</svg>
						<span class="text-sm font-bold text-green-600 dark:text-green-400">
							Now Playing
						</span>
					</div>
					{#if currentlyPlaying.context}
						<div class="text-xs text-foreground/50 flex items-center gap-1 truncate ml-2">
							<span class="text-foreground/40">from {currentlyPlaying.context.type}</span>
							{#if currentlyPlaying.context.url}
								<a
									href={currentlyPlaying.context.url}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-green-500 transition-colors font-medium truncate"
								>
									{currentlyPlaying.context.name}
								</a>
							{:else}
								<span class="font-medium truncate">{currentlyPlaying.context.name}</span>
							{/if}
						</div>
					{/if}
				</div>

				<div class="flex items-center gap-3">
					{#if currentlyPlaying.track.album.images[0]}
						<a
							href={currentlyPlaying.track.album.external_urls.spotify}
							target="_blank"
							rel="noopener noreferrer"
							class="flex-shrink-0"
						>
							<img
								src={currentlyPlaying.track.album.images[0].url}
								alt={currentlyPlaying.track.album.name}
								class="w-12 h-12 rounded shadow-md hover:shadow-xl transition-shadow"
							/>
						</a>
					{/if}

					<div class="flex-1 min-w-0 text-left">
						<a
							href={currentlyPlaying.track.external_urls.spotify}
							target="_blank"
							rel="noopener noreferrer"
							class="font-bold text-sm text-foreground hover:text-green-500 transition-colors block truncate"
						>
							{currentlyPlaying.track.name}
						</a>
						<div class="text-xs text-foreground/70 truncate">
							{#each currentlyPlaying.track.artists as artist, idx}
								{#if idx > 0}{', '}{/if}
								<a
									href={artist.external_urls.spotify}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-green-500 transition-colors"
								>
									{artist.name}
								</a>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Recently Played -->
		{#if recentlyPlayed.length > 0}
			<div>
				<h4 class="text-lg font-bold mb-3 text-foreground/90">
					Recently Played
				</h4>
				<div class="space-y-1">
					{#each recentlyPlayed.slice(0, 5) as item (item.track.id + '-' + item.playedAt)}
						<div class="flex items-center gap-3 py-1.5 px-3 bg-foreground/[0.03] dark:bg-foreground/[0.05] rounded-lg hover:bg-foreground/[0.06] dark:hover:bg-foreground/[0.08] transition-colors">
							{#if item.track.album.images[2]}
								<a
									href={item.track.album.external_urls.spotify}
									target="_blank"
									rel="noopener noreferrer"
									class="flex-shrink-0"
								>
									<img
										src={item.track.album.images[2].url}
										alt={item.track.album.name}
										class="w-12 h-12 rounded shadow"
									/>
								</a>
							{/if}

							<div class="flex-1 min-w-0 text-left">
								<a
									href={item.track.external_urls.spotify}
									target="_blank"
									rel="noopener noreferrer"
									class="font-semibold text-sm text-foreground hover:text-green-500 transition-colors block truncate"
								>
									{item.track.name}
								</a>
								<div class="text-xs text-foreground/70 truncate">
									{#each item.track.artists as artist, idx}
										{#if idx > 0}{', '}{/if}
										<a
											href={artist.external_urls.spotify}
											target="_blank"
											rel="noopener noreferrer"
											class="hover:text-green-500 transition-colors"
										>
											{artist.name}
										</a>
									{/each}
								</div>
							</div>

							<div class="flex-shrink-0 text-xs text-foreground/50 self-center">
								{formatRelativeTime(item.playedAt)}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Top Playlists -->
		{#if topPlaylists.length > 0}
			<div class="mt-6">
				<h4 class="text-lg font-bold mb-3 text-foreground/90">
					My Top 3 Most Saved Playlists
				</h4>
				<div class="space-y-3">
					{#each topPlaylists as playlist (playlist.id)}
						{@const totalHours = Math.round((playlist.totalDurationMs / 3600000) * 10) / 10}
						<div class="flex gap-4 p-3 bg-foreground/[0.03] dark:bg-foreground/[0.05] rounded-lg hover:bg-foreground/[0.06] dark:hover:bg-foreground/[0.08] transition-colors">
							{#if playlist.imageUrl}
								<a
									href={playlist.url}
									target="_blank"
									rel="noopener noreferrer"
									class="flex-shrink-0"
								>
									<img
										src={playlist.imageUrl}
										alt={playlist.name}
										class="w-20 h-20 sm:w-24 sm:h-24 rounded shadow"
									/>
								</a>
							{:else}
								<div class="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded shadow bg-foreground/10 flex items-center justify-center">
									<svg class="w-8 h-8 text-foreground/40" fill="currentColor" viewBox="0 0 24 24">
										<path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
									</svg>
								</div>
							{/if}

							<div class="flex-1 min-w-0">
								<a
									href={playlist.url}
									target="_blank"
									rel="noopener noreferrer"
									class="font-semibold text-sm text-foreground hover:text-green-500 transition-colors block truncate"
								>
									{playlist.name}
								</a>
								{#if playlist.description}
									<p class="text-xs text-foreground/60 mt-0.5 line-clamp-2">
										{playlist.description}
									</p>
								{/if}
								<div class="text-xs text-foreground/50 mt-1">
									{playlist.followers.toLocaleString()} saves &middot; {playlist.trackCount} songs, {Math.floor(totalHours)} hr {Math.round((totalHours % 1) * 60)} min
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- No Activity -->
		{#if showNoActivity}
			<div class="text-center p-6 bg-gradient-to-br from-primary/5 via-background/50 to-accent/5 dark:from-primary/10 dark:via-background/70 dark:to-accent/10 rounded-2xl backdrop-blur-sm border border-foreground/5 shadow-lg">
				<p class="text-foreground/70">
					No recent activity. Check back later!
				</p>
			</div>
		{/if}
	{/if}
</div>
