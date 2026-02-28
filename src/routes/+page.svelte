<script lang="ts">
	import { onMount } from 'svelte';
	import GitHubActivityGrid from '$lib/components/GitHubActivityGrid.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let asciiCharacters: string[] = [];
	
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
	});
</script>

<svelte:head>
	<title>davis9001 - David Monaghan</title>
	<meta name="description" content="Personal portfolio and dev showcase for Davis Monaghan" />
</svelte:head>

<main class="relative min-h-screen flex items-center justify-center px-2 sm:px-4 py-4 text-foreground text-center bg-primary/5 dark:bg-primary/100">
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

	<!-- Content on top of the background -->
	<div class="relative z-40 flex flex-col items-center bg-background/70 w-[min(96vw,56rem)] p-4 xs:p-5 sm:p-10 md:p-12 mx-2 sm:mx-4 my-3 sm:my-6 rounded-xl backdrop-blur-sm">
		<img
			class="mt-2 mb-5"
			src="/logo-green-Icon-250.webp"
			width="128"
			height="128"
			alt="the davis9001 logo: a 9 that roughly resembles a lowercase D, cut from a hexagon (not that anyone would notice)"
		/>
		
		<h1 class="text-3xl sm:text-4xl font-black tracking-tight leading-none mb-1">davis9001</h1>
		<h2 class="italic text-foreground/70 text-sm sm:text-base mb-4">
			David "davis9001" Monaghan
		</h2>
		<h3 class="text-xl sm:text-2xl leading-tight mb-1">Software and Community Architect</h3>
		
		<p class="font-extralight text-base sm:text-lg !mb-1">
			Currently building{' '}
			<a href="https://starspace.group" class="text-red-500">*Space</a>.
		</p>

		<p class="font-extralight text-base sm:text-lg max-w-screen-sm !mb-1">
			Check out my{' '}
			<a href="/portfolio" class="text-accent">Portfolio of Projects</a>.
		</p>

		<p class="font-extralight text-base sm:text-lg max-w-screen-sm !mb-3">
			<a href="/send" class="text-accent">Send a message</a>.
		</p>

		<SocialLinks />

		<div class="mt-3 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
			<div class="w-full flex flex-col gap-4 lg:gap-6">
				<GitHubActivityGrid />

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
					<p class="text-sm opacity-60">Coming soon...</p>
				</div>
			</div>

			<div class="w-full">
				<div class="p-6 bg-gradient-to-br from-primary/5 via-background/50 to-accent/5 dark:from-primary/10 dark:via-background/70 dark:to-accent/10 rounded-2xl backdrop-blur-sm border border-foreground/5 shadow-lg">
					<h3 class="text-xl sm:text-2xl font-black mb-4">Spotify Widget</h3>
					<p class="text-sm opacity-60">Coming soon...</p>
				</div>
			</div>
		</div>

		<div class="mt-6">
			<Footer />
		</div>
	</div>
</main>
