<script lang="ts">
	const currentYear = new Date().getFullYear();
</script>

<footer>
	<div class="container">
		<p>&copy; {currentYear} davis9001.dev | All rights reserved.</p>
	</div>
</footer>

<style>
	/* The footer had no vertical space at all, so the line sat hard against the
	   bottom of the window — most obvious on a page that exactly fills it, like
	   a post in three-column mode, but it was tight everywhere. */
	footer {
		border-top: 1px solid var(--color-border);
		padding: var(--spacing-xl) 0;
	}

	footer p {
		margin: 0;
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}
</style>
