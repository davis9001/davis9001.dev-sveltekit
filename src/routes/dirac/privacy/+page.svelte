<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';

	const lastUpdated = 'August 20, 2026';
</script>

<SEO
	title="Dirac Discord App — Privacy Policy"
	description="What the Dirac Discord application reads, stores, and sends elsewhere."
	path="/dirac/privacy"
/>

<main class="legal-page">
	<div class="legal-container">
		<header class="legal-header">
			<h1>Dirac — Privacy Policy</h1>
			<p class="legal-updated">Last updated: {lastUpdated}</p>
		</header>

		<section class="legal-section">
			<h2>Who Operates It</h2>
			<p>
				Dirac is operated by David Monaghan on hardware he owns. It is a personal assistant in a
				small number of private servers, not a hosted service. There is no company behind it and no
				staff with access to it.
			</p>
		</section>

		<section class="legal-section">
			<h2>Information We Collect</h2>
			<p>Dirac reads the following, and nothing else:</p>
			<ul>
				<li>
					<strong>Messages in channels that were opted in.</strong> A channel is added to an allow
					list by the operator, from his own terminal. Dirac cannot read a channel that is not on
					that list.
				</li>
				<li>
					<strong>Direct messages from allowed accounts.</strong> A direct message from any other
					account is dropped rather than answered. The account name, the account ID, and the text
					are written to a local log so that the operator can see who tried, and the sender is told
					nothing.
				</li>
				<li>
					<strong>Speech in voice channels that Dirac has joined.</strong> Audio is converted to
					text so that the application can answer. Only accounts with a role are transcribed;
					others are noted as present and not transcribed.
				</li>
				<li>
					<strong>Attachment names, types, and sizes.</strong> The file itself is downloaded only
					when the operator asks for it.
				</li>
			</ul>
			<p>
				Each of these carries the Discord account ID, the display name, the channel, and a
				timestamp, because that is what identifies who said what and where.
			</p>
			<p>
				Dirac does not read message history it was not sent, does not collect your email address or
				payment details, and has no advertising or analytics of any kind.
			</p>
		</section>

		<section class="legal-section">
			<h2>How Information Is Used</h2>
			<p>
				Your message is used to produce an answer, and for no other purpose. To do that it is sent
				to a large language model. That model is operated by Anthropic and runs on Anthropic's
				systems, under their terms. Speech to text and some short replies run locally on the
				operator's machine and go nowhere.
			</p>
			<p>
				Content is also written to local logs so that the operator can see what his own machine did.
				That includes security events, such as a message that was dropped, or an action that was
				refused.
			</p>
		</section>

		<section class="legal-section">
			<h2>Information Sharing</h2>
			<p>
				Nothing is sold, rented, or given to advertisers. The only third party that receives message
				content is the model provider named above, and only to produce the answer you asked for.
			</p>
			<p>
				Discord itself holds your messages under
				<a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">
					Discord's privacy policy</a
				>, whether Dirac is present or not.
			</p>
		</section>

		<section class="legal-section">
			<h2>Data Retention</h2>
			<p>
				Logs and transcripts are kept on the operator's own machine. They are kept for as long as
				they are useful and are not published. They are backed up with the rest of that machine, to
				storage the operator controls.
			</p>
		</section>

		<section class="legal-section">
			<h2>Data Security</h2>
			<p>
				The machine is encrypted at rest and the logs are readable only by the operator's account.
				No claim is made that this is more than one careful person's setup, because it is not.
			</p>
		</section>

		<section class="legal-section">
			<h2>Your Rights</h2>
			<p>
				You can ask what has been recorded about you, and you can ask for it to be erased. Use the
				<a href="/send">contact form</a> and say which Discord account you are. Erasure is done on
				request and is not conditional.
			</p>
			<p>
				You can also stop the collection yourself: leave the channel, or ask the server owner to
				remove the application.
			</p>
		</section>

		<section class="legal-section">
			<h2>Children</h2>
			<p>
				Discord requires its users to be 13 or older, and Dirac is only in adult private servers. It
				is not directed at children and does not knowingly record information from them.
			</p>
		</section>

		<section class="legal-section">
			<h2>Changes to This Policy</h2>
			<p>
				This policy can change. The date at the top says when it last did.
			</p>
		</section>

		<section class="legal-section">
			<h2>Contact</h2>
			<p>
				Questions, and requests to see or erase what was recorded, go through the
				<a href="/send">contact form</a>. The rules for using the application are in the
				<a href="/dirac/terms">terms of service</a>.
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
