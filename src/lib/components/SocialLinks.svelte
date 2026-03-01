<script lang="ts">
	const links = [
		{ href: 'https://github.com/davis9001/', label: 'GitHub', icon: 'github' },
		{ href: 'https://discord.gg/KWfEvTF4NF', label: 'Discord', icon: 'discord' },
		{ href: 'https://bsky.app/profile/davis9001.dev', label: 'Bluesky', icon: 'bluesky' },
		{ href: 'https://mastodon.social/@davis9001', label: 'Mastodon', icon: 'mastodon' },
		{ href: 'https://en.wikipedia.org/wiki/User:David_Monaghan', label: 'Wikipedia', icon: 'wikipedia' },
		{ href: 'https://x.com/williamonaghan', label: 'X/Twitter', icon: 'x' },
		{ href: 'https://www.linkedin.com/in/davidmonaghan/', label: 'LinkedIn', icon: 'linkedin' },
		{ href: 'https://open.spotify.com/user/12810003?si=c67601d0640d4c9f', label: 'Spotify', icon: 'spotify' },
		{ href: 'https://soundcloud.com/davis9001', label: 'SoundCloud', icon: 'soundcloud' },
		{ href: 'https://www.instagram.com/davis9k1/', label: 'Instagram', icon: 'instagram' },
		{ href: 'https://sora.chatgpt.com/profile/davis9001', label: 'OpenAI', icon: 'openai' }
	];

	/** Tabler Icons — stroke-based, multi-path (matching the old Fresh site) */
	const iconPaths: Record<string, string[]> = {
		github: [
			'M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5'
		],
		discord: [
			'M8 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0',
			'M14 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0',
			'M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-.972 1.923a11.913 11.913 0 0 0 -4.053 0l-.975 -1.923c-1.5 .16 -3.043 .485 -4.5 1.5c-2 5.667 -2.167 9.833 -1.5 11.5c.667 1.333 2 3 3.5 3c.5 0 2 -2 2 -3',
			'M7 16.5c3.5 1 6.5 1 10 0'
		],
		bluesky: [
			'M6.335 5.144c-1.654 -1.199 -4.335 -2.127 -4.335 .826c0 .59 .35 4.953 .556 5.661c.713 2.463 3.13 2.75 5.444 2.369c-4.045 .665 -4.889 3.208 -2.667 5.41c1.03 1.018 1.913 1.59 2.667 1.59c2 0 3.134 -2.769 3.5 -3.5c.333 -.667 .5 -1.167 .5 -1.5c0 .333 .167 .833 .5 1.5c.366 .731 1.5 3.5 3.5 3.5c.754 0 1.637 -.571 2.667 -1.59c2.222 -2.203 1.378 -4.746 -2.667 -5.41c2.314 .38 4.73 .094 5.444 -2.369c.206 -.708 .556 -5.072 .556 -5.661c0 -2.953 -2.68 -2.025 -4.335 -.826c-2.293 1.662 -4.76 5.048 -5.665 6.856c-.905 -1.808 -3.372 -5.194 -5.665 -6.856z'
		],
		mastodon: [
			'M18.648 15.254c-1.816 1.763 -6.648 1.626 -6.648 1.626a18.262 18.262 0 0 1 -3.288 -.256c1.127 1.985 4.12 2.81 8.982 2.475c-1.945 2.013 -13.598 5.257 -13.668 -7.636l-.026 -1.154c0 -3.036 .023 -4.115 1.352 -5.633c1.671 -1.91 6.648 -1.666 6.648 -1.666s4.977 -.243 6.648 1.667c1.329 1.518 1.352 2.597 1.352 5.633s-.456 4.074 -1.352 4.944z',
			'M12 11.204v-2.926c0 -1.258 -.895 -2.278 -2 -2.278s-2 1.02 -2 2.278v4.722m4 -4.722c0 -1.258 .895 -2.278 2 -2.278s2 1.02 2 2.278v4.722'
		],
		wikipedia: [
			'M3 4.984h2',
			'M8 4.984h2.5',
			'M14.5 4.984h2.5',
			'M22 4.984h-2',
			'M4 4.984l5.455 14.516l6.545 -14.516',
			'M9 4.984l6 14.516l6 -14.516'
		],
		x: [
			'M4 4l11.733 16h4.267l-11.733 -16z',
			'M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772'
		],
		linkedin: [
			'M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z',
			'M8 11l0 5',
			'M8 8l0 .01',
			'M12 16l0 -5',
			'M16 16v-3a2 2 0 0 0 -4 0'
		],
		spotify: [
			'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
			'M8 11.973c2.5 -1.473 5.5 -.973 7.5 .527',
			'M9 15c1.5 -1 4 -1 5 .5',
			'M7 9c2 -1 6 -2 10 .5'
		],
		soundcloud: [
			'M17 11h1c1.38 0 3 1.274 3 3c0 1.657 -1.5 3 -3 3l-6 0v-10c3 0 4.5 1.5 5 4z',
			'M9 8l0 9',
			'M6 17l0 -7',
			'M3 16l0 -2'
		],
		instagram: [
			'M4 4m0 4a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z',
			'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
			'M16.5 7.5l0 .01'
		],
		openai: [
			'M11.217 19.384a3.501 3.501 0 0 0 6.783 -1.217v-5.167l-6 -3.35',
			'M5.214 15.014a3.501 3.501 0 0 0 4.446 5.266l4.34 -2.534v-6.946',
			'M6 7.63c-1.391 -.236 -2.787 .395 -3.534 1.689a3.474 3.474 0 0 0 1.271 4.745l4.263 2.514l6 -3.348',
			'M12.783 4.616a3.501 3.501 0 0 0 -6.783 1.217v5.067l6 3.45',
			'M18.786 8.986a3.501 3.501 0 0 0 -4.446 -5.266l-4.34 2.534v6.946',
			'M18 16.302c1.391 .236 2.787 -.395 3.534 -1.689a3.474 3.474 0 0 0 -1.271 -4.745l-4.308 -2.514l-5.955 3.42'
		]
	};
</script>

<div class="flex flex-wrap justify-center gap-4 my-4 max-w-2xl mx-auto relative z-50">
	{#each links as link}
		<a
			href={link.href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={link.label}
			class="text-foreground/55 hover:text-accent cursor-pointer relative z-50 transition-colors"
		>
			<svg
				class="w-8 h-8"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				{#each iconPaths[link.icon] as d}
					<path d={d} />
				{/each}
			</svg>
		</a>
	{/each}
</div>
