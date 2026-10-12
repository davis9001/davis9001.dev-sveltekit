/**
 * Video embed — a short clip with sound, played in place.
 *
 * The sanitizer does not allow <video> in stored HTML, so a clip goes in as an
 * embed and only same-site uploads are played (see `safeMediaPath`): a post
 * cannot point the player at another origin.
 */
import { defineEmbed } from '../props-schema';

export const definition = defineEmbed({
	name: 'video',
	label: 'Video',
	description: 'A short video clip from the media library, with an optional caption.',
	props: [
		{
			key: 'src',
			label: 'Video',
			type: 'string',
			default: '',
			placeholder: '/media/uploads/<id>.mp4'
		},
		{
			key: 'poster',
			label: 'Poster image',
			type: 'string',
			default: '',
			placeholder: '/media/uploads/<id>.webp'
		},
		{ key: 'label', label: 'Accessible description', type: 'string', default: '' },
		{ key: 'caption', label: 'Caption', type: 'string', default: '' }
	]
});

/** Only same-site media uploads may be played; anything else renders nothing. */
export function safeMediaPath(value: unknown): string {
	if (typeof value !== 'string') return '';
	return /^\/media\/[A-Za-z0-9/_.-]+$/.test(value) && !value.includes('..') ? value : '';
}
