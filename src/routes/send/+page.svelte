<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let message = '';
	let name = '';
	let contact = '';
	let isSubmitting = false;

	$: hasContent = message.trim().length > 0;
	$: user = data.user;
</script>

<svelte:head>
	<title>Send | davis9001.dev</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="send-page">
	<h1>Send a Message</h1>
	<p class="subtitle">Have something to share? Send a message below.</p>

	{#if form?.success}
		<div class="alert alert-success">Message sent successfully!</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-error">{form.error}</div>
	{/if}

	{#if !form?.success}
		{#if user}
			<div class="user-info">
				{#if user.avatarUrl}
					<img src={user.avatarUrl} alt={user.login} class="user-avatar" />
				{/if}
				<div>
					<span class="user-info-text">Sending as </span>
					<a
						href="https://github.com/{user.login}"
						class="user-link"
						target="_blank"
						rel="noopener"
					>
						@{user.login}
					</a>
					{#if user.name}
						<span class="user-name-extra"> ({user.name})</span>
					{/if}
				</div>
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					await update();
				};
			}}
		>
			<div class="form-group">
				<label for="message">
					Message <span class="required">(required)</span>
				</label>
				<textarea
					id="message"
					name="message"
					rows="6"
					maxlength="2000"
					required
					placeholder="Type your message here..."
					bind:value={message}
				/>
			</div>

			<div class="form-group">
				<label for="name">
					Name <span class="optional">(optional)</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					placeholder="Your name"
					bind:value={name}
				/>
			</div>

			<div class="form-group">
				<label for="contact">
					Contact info <span class="optional">(optional — email, phone, etc.)</span>
				</label>
				<input
					type="text"
					id="contact"
					name="contact"
					placeholder="Email, phone, or other way to reach you"
					bind:value={contact}
				/>
			</div>

			<button type="submit" class="submit-btn" disabled={isSubmitting}>
				{#if isSubmitting}
					Sending...
				{:else}
					Send Message
				{/if}
			</button>
		</form>

		<!-- Live Preview -->
		{#if hasContent}
			<div class="preview-section">
				<p class="preview-label">Preview</p>
				<div class="preview-card">
					<div class="preview-title">New Message from /send</div>
					<div class="preview-message">{message.trim()}</div>
					<div class="preview-grid">
						<div>
							<div class="preview-field-label">From</div>
							<div class="preview-field-value">{name.trim() || 'anonymous'}</div>
						</div>
						<div>
							<div class="preview-field-label">Contact</div>
							<div class="preview-field-value">{contact.trim() || 'not provided'}</div>
						</div>
						<div>
							<div class="preview-field-label">IP</div>
							<div class="preview-field-value">your IP</div>
						</div>
					</div>
					{#if user}
						<div class="preview-grid preview-grid-extra">
							<div>
								<div class="preview-field-label">GitHub User</div>
								<div class="preview-field-value">
									<a
										href="https://github.com/{user.login}"
										class="preview-link"
										target="_blank"
										rel="noopener">@{user.login}</a
									>
								</div>
							</div>
							<div>
								<div class="preview-field-label">Display Name</div>
								<div class="preview-field-value">{user.name || 'not set'}</div>
							</div>
							<div>
								<div class="preview-field-label">Avatar</div>
								<div>
									{#if user.avatarUrl}
										<img
											src={user.avatarUrl}
											alt={user.login}
											class="preview-avatar"
										/>
									{/if}
								</div>
							</div>
						</div>
					{/if}
					<div class="preview-footer">davis9001.dev</div>
				</div>
			</div>
		{/if}
	{:else}
		<a href="/send" class="send-another">Send another message</a>
	{/if}
</div>

<style>
	.send-page {
		max-width: 36rem;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	h1 {
		font-size: 1.875rem;
		font-weight: 700;
		margin-bottom: var(--spacing-xs);
		color: var(--color-text);
	}

	.subtitle {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xl);
	}

	/* Alerts */
	.alert {
		margin-bottom: var(--spacing-lg);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		border: 1px solid;
	}

	.alert-success {
		background-color: var(--color-success-bg, rgba(34, 197, 94, 0.1));
		color: var(--color-success);
		border-color: var(--color-success);
	}

	.alert-error {
		background-color: var(--color-error-bg, rgba(239, 68, 68, 0.1));
		color: var(--color-error);
		border-color: var(--color-error);
	}

	/* User info banner */
	.user-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
		border-radius: var(--radius-md);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		font-size: 0.875rem;
		margin-bottom: var(--spacing-lg);
	}

	.user-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
	}

	.user-info-text {
		color: var(--color-text-secondary);
	}

	.user-link {
		font-weight: 600;
		color: var(--color-primary);
	}

	.user-link:hover {
		text-decoration: underline;
	}

	.user-name-extra {
		color: var(--color-text-secondary);
	}

	/* Form */
	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xs);
	}

	.required {
		color: var(--color-error);
		font-weight: 400;
	}

	.optional {
		color: var(--color-text-secondary);
		font-weight: 400;
		font-style: italic;
	}

	textarea,
	input[type='text'] {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-sm);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background-color: var(--color-surface);
		color: var(--color-text);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		transition: border-color var(--transition-fast);
	}

	textarea::placeholder,
	input[type='text']::placeholder {
		color: var(--color-text-secondary);
	}

	textarea:focus,
	input[type='text']:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	textarea {
		resize: vertical;
	}

	.submit-btn {
		align-self: flex-start;
		padding: var(--spacing-sm) var(--spacing-lg);
		border-radius: var(--radius-md);
		background-color: var(--color-primary);
		color: var(--color-background);
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.submit-btn:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.submit-btn:focus {
		outline: none;
		box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 4px var(--color-background);
	}

	/* Send another */
	.send-another {
		display: inline-block;
		margin-top: var(--spacing-md);
		color: var(--color-primary);
	}

	.send-another:hover {
		text-decoration: underline;
	}

	/* Preview */
	.preview-section {
		margin-top: var(--spacing-xl);
	}

	.preview-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xs);
	}

	.preview-card {
		border-left: 4px solid var(--color-primary);
		background-color: var(--color-surface);
		padding: var(--spacing-md);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
	}

	.preview-title {
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.preview-message {
		background-color: var(--color-background);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm) var(--spacing-sm);
		font-family: var(--font-mono);
		color: var(--color-text);
		white-space: pre-wrap;
		margin-bottom: var(--spacing-sm);
	}

	.preview-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--spacing-sm);
		font-size: 0.75rem;
	}

	.preview-grid-extra {
		margin-top: var(--spacing-sm);
	}

	.preview-field-label {
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.preview-field-value {
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.preview-link {
		color: var(--color-primary);
		font-style: normal;
	}

	.preview-link:hover {
		text-decoration: underline;
	}

	.preview-avatar {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
	}

	.preview-footer {
		margin-top: var(--spacing-sm);
		font-size: 0.625rem;
		color: var(--color-text-secondary);
	}
</style>
