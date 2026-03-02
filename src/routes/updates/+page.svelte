<!--
  Blog List Page (Updates)

  Displays all blog posts sorted by date, matching the live davis9001.dev /updates page.
  Dark background with subtle blurred background image, simple header, cards on dark bg.
-->
<script lang="ts">
	import { formatBlogDate } from '$lib/utils/blog';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: posts = data.posts || [];
</script>

<SEO
	title="Updates"
	description="Blog posts, updates, and articles by David Monaghan."
	path="/updates"
/>

<div class="px-3 sm:px-4 py-2 bg-background text-foreground min-h-screen overflow-x-hidden">
	<!-- Simple Header -->
	<header class="flex justify-between items-center p-2 sm:p-4 mx-auto z-50 relative gap-2">
		<nav class="flex-shrink-0">
			<a href="/" class="internal-button text-sm px-3 py-2">« davis9001.dev</a>
		</nav>
		<div class="flex items-center gap-4">
			<ThemeSwitcher variant="inline" simpleToggle={true} />
		</div>
	</header>

	<main class="md:p-9 flex-1">
		<!-- Title section with background image -->
		<div class="flex relative">
			<div
				class="fixed inset-0 bg-cover bg-center bg-no-repeat z-10 opacity-10 blur-md"
				style="background-image:url('/davis9001-2.webp');background-size:contain;background-position:-9ch 18em;"
			></div>
			<div class="flex content-center justify-center z-50 relative">
				<h1 class="text-4xl font-bold flex space-x-3 heading-title">
					<img
						src="/logo-green-Icon-250.webp"
						alt="davis9001 logo"
						class="w-12 h-12 md:w-24 md:h-24"
					/>
					Updates (the davis9001 blog)
				</h1>
			</div>
		</div>

		<!-- Blog post cards -->
		<div class="md:p-5 z-50 relative">
			{#each posts as post}
				<div class="md:p-3 m-1 sm:p-9 sm:m-3">
					<div class="m-5 p-5 rounded-2xl">
						<a class="text-accent" href="/updates/{post.slug}">
							<h2 class="text-2xl font-bold">{post.title}</h2>
							{#if post.publishedAt}
								<time datetime={post.publishedAt} class="text-foreground/60">
									{formatBlogDate(post.publishedAt)}
								</time>
							{/if}
							<div class="mt-4 text-foreground">{post.summary}</div>
						</a>
					</div>
				</div>
			{/each}
		</div>
	</main>

	<SocialLinks />
	<Footer />
</div>

<style>
	.heading-title {
		margin: 2rem 0;
		align-items: center;
	}
</style>
