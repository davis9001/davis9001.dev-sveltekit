/**
 * CMS Content Type Registry
 *
 * This is the central place to register content types. To add a new content type:
 *
 * 1. Create a definition object following ContentTypeDefinition interface
 * 2. Add it to the contentTypeRegistry array
 * 3. That's it! Routes and admin UI are auto-generated.
 *
 * The registry is synced to D1 on first access, so changes here
 * are reflected in the database automatically.
 */

import type { ContentTypeDefinition } from './types';

export const blogContentType: ContentTypeDefinition = {
	slug: 'blog',
	name: 'Blog Posts',
	description: 'Blog articles, news, and updates',
	icon: 'article',
	fields: [
		{
			name: 'excerpt',
			label: 'Excerpt',
			type: 'textarea',
			required: true,
			placeholder: 'A brief summary of the post...',
			helpText: 'Shown on list pages and in search results',
			validation: { maxLength: 300 },
			sortOrder: 1
		},
		{
			name: 'body',
			label: 'Body',
			type: 'richtext',
			required: true,
			helpText: 'The main content of the post (supports Markdown)',
			sortOrder: 2
		},
		{
			name: 'featured_image',
			label: 'Featured Image',
			type: 'image',
			placeholder: 'https://example.com/image.jpg',
			helpText: 'Upload an image or paste a URL',
			sortOrder: 3
		},
		{
			name: 'category',
			label: 'Category',
			type: 'select',
			options: [
				{ label: 'General', value: 'general' },
				{ label: 'Tutorial', value: 'tutorial' },
				{ label: 'News', value: 'news' },
				{ label: 'Update', value: 'update' },
				{ label: 'Guide', value: 'guide' }
			],
			defaultValue: 'general',
			sortOrder: 4
		},
		{
			name: 'read_time',
			label: 'Read Time (minutes)',
			type: 'number',
			placeholder: '5',
			helpText: 'Estimated reading time',
			validation: { min: 1, max: 120 },
			sortOrder: 5
		}
	],
	settings: {
		hasDrafts: true,
		hasTags: true,
		hasSEO: true,
		hasAuthor: true,
		routePrefix: '/blog',
		listPageSize: 12,
		defaultSort: 'published_at',
		defaultSortDirection: 'desc',
		isPublic: true,
		listTemplate: 'blog-list',
		itemTemplate: 'blog-item'
	}
};

export const predictionsContentType: ContentTypeDefinition = {
	slug: 'predictions',
	name: 'Predictions',
	description: 'Public predictions about the future, with provable timestamping',
	icon: 'crystal-ball',
	fields: [
		{
			name: 'body',
			label: 'Body',
			type: 'richtext',
			required: true,
			helpText: 'The full description of the prediction and its terms',
			lockedAfterPublish: true,
			sortOrder: 1
		},
		{
			name: 'date_window_start',
			label: 'Date window start',
			type: 'date',
			helpText: 'When the prediction window opens (optional, for open-ended predictions)',
			lockedAfterPublish: true,
			sortOrder: 2
		},
		{
			name: 'date_window_end',
			label: 'Date window end',
			type: 'date',
			helpText: 'When the prediction window closes (optional, for open-ended predictions)',
			lockedAfterPublish: true,
			sortOrder: 3
		},
		{
			name: 'resolution_status',
			label: 'Resolution status',
			type: 'select',
			options: [
				{ label: 'Pending', value: 'pending' },
				{ label: 'Correct', value: 'correct' },
				{ label: 'Incorrect', value: 'incorrect' },
				{ label: 'Partial', value: 'partial' }
			],
			defaultValue: 'pending',
			helpText: 'Set once the prediction window has passed',
			stampProvenanceOnChange: true,
			sortOrder: 4
		},
		{
			name: 'resolution_note',
			label: 'Resolution note',
			type: 'textarea',
			helpText: 'Explain how the prediction was resolved',
			stampProvenanceOnChange: true,
			sortOrder: 5
		}
	],
	settings: {
		hasDrafts: true,
		hasTags: false,
		hasSEO: true,
		hasAuthor: true,
		routePrefix: '/predictions',
		listPageSize: 12,
		defaultSort: 'published_at',
		defaultSortDirection: 'desc',
		isPublic: true,
		listTemplate: 'predictions-list',
		itemTemplate: 'predictions-item',
		lockTitleAndSlugAfterPublish: true,
		enableTimestampProof: true,
		publicArchiveVisible: true
	}
};

export const contentTypeRegistry: ContentTypeDefinition[] = [
	blogContentType,
	predictionsContentType
];

/**
 * Look up a content type definition by slug.
 */
export function getContentTypeDefinition(slug: string): ContentTypeDefinition | undefined {
	return contentTypeRegistry.find((ct) => ct.slug === slug);
}

/**
 * Get all registered content type slugs.
 */
export function getRegisteredSlugs(): string[] {
	return contentTypeRegistry.map((ct) => ct.slug);
}

/**
 * Check if a slug is a registered content type.
 */
export function isRegisteredContentType(slug: string): boolean {
	return contentTypeRegistry.some((ct) => ct.slug === slug);
}
