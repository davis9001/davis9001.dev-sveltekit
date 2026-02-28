<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
</script>

<SEO
	title="Life of a Stranger"
	description="Life of a Stranger — an art installation by davis9001."
	path="/lifeofastranger"
/>

<div class="loas-page">
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 1"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-1"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 2"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-2"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 3"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-3"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 4"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-4"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 5"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-5"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 6"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-6"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 7"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-7"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 8"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-8"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 9"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-9"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 10"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-10"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 11"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-11"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 12"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-12"
	></iframe>
	<iframe
		src="https://www.lifeofastranger.net/"
		title="Life of a Stranger - background 13"
		width="50%"
		height="50%"
		scrolling="no"
		class="bg-iframe iframe-13"
	></iframe>

	<div class="rabbit-container">
		<span class="rabbit">🐰</span>
	</div>

	<div class="darko-overlay">
		<img src="/lifeofastranger/darko-donnie.gif" alt="Donnie Darko" />
	</div>
</div>

<style>
	.loas-page {
		height: 100vh;
		background-color: #09090b;
		overflow: hidden;
		position: relative;
	}

	.bg-iframe {
		position: absolute;
		opacity: 0.25;
		border: none;
		display: none;
	}

	@media (min-width: 768px) {
		.bg-iframe {
			display: block;
		}
	}

	.iframe-1 {
		transform: rotate(-6deg);
		bottom: 0;
	}

	.iframe-2 {
		transform: rotate(12deg);
	}

	.iframe-3 {
		transform: rotate(45deg);
		right: 0.5rem;
	}

	.iframe-4 {
		transform: rotate(-69deg);
	}

	.iframe-5 {
		transform: rotate(69deg);
		bottom: 0;
		right: 0;
	}

	.iframe-6 {
		transform: rotate(-45deg);
		right: 24rem;
		top: 33%;
	}

	.iframe-7 {
		transform: rotate(-6deg);
		bottom: 1.75rem;
		right: 1.75rem;
	}

	.iframe-8 {
		transform: rotate(-6deg);
		bottom: 1.75rem;
		right: 1.75rem;
	}

	.iframe-9 {
		transform: rotate(-17deg);
		bottom: 1.75rem;
		right: 6rem;
	}

	.iframe-10 {
		transform: rotate(-6deg);
		bottom: 1.75rem;
		right: 1.75rem;
	}

	.iframe-11 {
		transform: rotate(-6deg);
		bottom: 1.75rem;
		right: 1.75rem;
	}

	.iframe-12 {
		display: block;
		transform: rotate(-6deg);
		bottom: 3.5rem;
		right: 1.75rem;
	}

	.iframe-13 {
		transform: rotate(-6deg);
		bottom: 3rem;
		right: 1.75rem;
	}

	.rabbit-container {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		z-index: 10;
	}

	.rabbit {
		display: inline-block;
		font-size: 9rem;
		cursor: help;
		transition: font-size 500ms, transform 500ms;
	}

	@media (min-width: 768px) {
		.rabbit {
			font-size: 12rem;
		}
	}

	.rabbit:hover {
		font-size: 23rem;
		transform: rotate(3240deg);
	}

	.darko-overlay {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		z-index: 0;
		opacity: 0.25;
		transform: rotate(-32deg);
	}

	.darko-overlay img {
		max-width: 100%;
		height: auto;
	}
</style>
