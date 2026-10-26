export interface ErrorCopy {
	title: string;
	message: string;
}

const COPY: Record<number, ErrorCopy> = {
	400: { title: 'That request was off', message: 'Something in the request was wrong. Check the link and try again.' },
	401: { title: 'Sign in first', message: 'This page needs you to be signed in.' },
	403: { title: 'Not for you', message: "You don't have access to this page." },
	404: { title: "There's nothing here", message: 'The link is wrong, or the page moved. The crow looked and found nothing.' },
	405: { title: "That doesn't work here", message: 'This address does not accept that kind of request.' },
	429: { title: 'Too many requests', message: 'Slow down a little and try again in a minute.' },
	500: { title: 'Something broke', message: "That's on me, not you. Try again in a bit." },
	502: { title: 'Bad connection', message: 'A service behind this page did not answer. Try again in a bit.' },
	503: { title: 'Back soon', message: 'The site is down for a short while. Try again soon.' },
	504: { title: 'Took too long', message: 'The page did not answer in time. Try again.' }
};

/** Plain-language title and message for an HTTP error status. */
export function errorCopy(status: number, fallbackMessage?: string): ErrorCopy {
	return (
		COPY[status] ?? {
			title: 'Something went wrong',
			message: status >= 500 ? 'That is a fault on my side. Try again in a bit.' : fallbackMessage || 'That did not work.'
		}
	);
}
