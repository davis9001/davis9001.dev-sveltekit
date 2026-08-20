<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';

	const lastUpdated = 'August 20, 2026';
</script>

<SEO
	title="Dirac Discord App — Terms of Service"
	description="Terms of service for the Dirac Discord application."
	path="/dirac/terms"
/>

<main class="legal-page">
	<div class="legal-container">
		<header class="legal-header">
			<h1>Dirac — Terms of Service</h1>
			<p class="legal-updated">Last updated: {lastUpdated}</p>
		</header>

		<section class="legal-section">
			<h2>What Dirac Is</h2>
			<p>
				Dirac is a personal assistant application for Discord. It is operated by David Monaghan on
				his own hardware. It is not a company, a product, or a hosted service that you can sign up
				for.
			</p>
			<p>
				Dirac joins a small number of private servers by invitation. There is no public invite link,
				no account to create, and no fee. If Dirac is in a server you are in, someone with authority
				over that server put it there.
			</p>
		</section>

		<section class="legal-section">
			<h2>Acceptance</h2>
			<p>
				If you send a message that Dirac can read, or speak in a voice channel that Dirac has
				joined, you accept these terms. If you do not accept them, do not interact with the
				application. You can also ask the server owner to remove it.
			</p>
			<p>
				These terms can change. The date above says when they last did.
			</p>
		</section>

		<section class="legal-section">
			<h2>Use of Service</h2>
			<p>
				Use Dirac lawfully. The operator may stop responding to any account, at any time, for any
				reason, and does not have to explain why.
			</p>
			<h3>Prohibited Activities</h3>
			<p>Do not:</p>
			<ul>
				<li>Use the application for an illegal purpose</li>
				<li>Try to obtain access, data, or actions that the operator has not granted you</li>
				<li>Try to make the application act against its operator, or misrepresent who you are</li>
				<li>Send malware, or content designed to damage a system that reads it</li>
				<li>Harass another person through the application</li>
				<li>Automate traffic to the application without permission</li>
			</ul>
		</section>

		<section class="legal-section">
			<h2>User Accounts</h2>
			<p>
				Dirac has no accounts of its own. Your identity is your Discord account, and the permissions
				you have are the ones the operator has granted to that account. Permissions are not
				transferable, and a claim made inside a message does not grant any.
			</p>
		</section>

		<section class="legal-section">
			<h2>Availability</h2>
			<p>
				Dirac runs on one machine. It goes offline for updates, reboots, power cuts, and network
				faults. There is no uptime commitment, no support channel, and no guarantee that a message
				gets an answer.
			</p>
		</section>

		<section class="legal-section">
			<h2>Intellectual Property</h2>
			<p>
				You keep the rights to what you write. The application, its name, and its configuration
				belong to the operator. Answers produced by the application are generated text; treat them
				as information, not as professional advice.
			</p>
		</section>

		<section class="legal-section">
			<h2>Limitation of Liability</h2>
			<p>
				The application is provided as is. The operator is not liable for loss or damage that
				follows from its use, from its answers, or from its absence.
			</p>
		</section>

		<section class="legal-section">
			<h2>Termination</h2>
			<p>
				The operator can remove the application from a server, or stop responding to an account,
				without notice. A server owner can remove the application at any time.
			</p>
		</section>

		<section class="legal-section">
			<h2>Contact</h2>
			<p>
				Questions about these terms go through the
				<a href="/send">contact form</a>. What Dirac records, and what you can ask to have removed,
				is described in the <a href="/dirac/privacy">privacy policy</a>.
			</p>
		</section>
	</div>
</main>

<style>
	.legal-page {
		min-height: 100vh;
		padding: var(--spacing-xl) var(--spacing-md);
		background-color: var(--color-background);
	}

	.legal-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.legal-header {
		text-align: center;
		margin-bottom: var(--spacing-2xl);
		padding-bottom: var(--spacing-xl);
		border-bottom: 1px solid var(--color-border);
	}

	.legal-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.legal-updated {
		color: var(--color-text-secondary);
		font-size: 0.9375rem;
	}

	.legal-section {
		margin-bottom: var(--spacing-2xl);
	}

	.legal-section h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
	}

	.legal-section h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		margin-top: var(--spacing-lg);
		margin-bottom: var(--spacing-sm);
	}

	.legal-section p {
		color: var(--color-text-secondary);
		line-height: 1.7;
		margin-bottom: var(--spacing-md);
	}

	.legal-section ul {
		color: var(--color-text-secondary);
		margin-left: var(--spacing-xl);
		margin-bottom: var(--spacing-md);
	}

	.legal-section li {
		margin-bottom: var(--spacing-sm);
		line-height: 1.6;
	}

	.legal-section a {
		color: var(--color-primary);
		text-decoration: none;
	}

	.legal-section a:hover {
		text-decoration: underline;
	}

	@media (min-width: 768px) {
		.legal-page {
			padding: var(--spacing-2xl);
		}

		.legal-header h1 {
			font-size: 3rem;
		}
	}
</style>
