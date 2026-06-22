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
			type: 'url',
			placeholder: 'https://example.com/image.jpg',
			helpText: 'URL to the featured image',
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

export const openProjectsContentType: ContentTypeDefinition = {
	slug: 'open-projects',
	name: 'Open Projects',
	description: 'Active projects and their tasks, status, and blockers',
	icon: 'rocket',
	fields: [
		{
			name: 'group',
			label: 'Group',
			type: 'select',
			required: true,
			options: [
				{ label: '*Space', value: '*Space' },
				{ label: 'Personal', value: 'Personal' }
			],
			sortOrder: 1
		},
		{
			name: 'project_name',
			label: 'Project Name',
			type: 'text',
			required: true,
			placeholder: 'e.g. NebulaKit',
			sortOrder: 2
		},
		{
			name: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ label: 'Active', value: 'active' },
				{ label: 'Planning', value: 'planning' },
				{ label: 'Paused', value: 'paused' },
				{ label: 'Blocked', value: 'blocked' },
				{ label: 'Complete', value: 'complete' }
			],
			defaultValue: 'active',
			sortOrder: 3
		},
		{
			name: 'priority',
			label: 'Priority',
			type: 'select',
			options: [
				{ label: 'High', value: 'high' },
				{ label: 'Medium', value: 'medium' },
				{ label: 'Low', value: 'low' }
			],
			defaultValue: 'medium',
			sortOrder: 4
		},
		{
			name: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Short summary of what this project is...',
			sortOrder: 5
		},
		{
			name: 'primary_link',
			label: 'Primary Link',
			type: 'url',
			placeholder: 'https://example.com',
			sortOrder: 6
		},
		{
			name: 'github_url',
			label: 'GitHub URL',
			type: 'url',
			placeholder: 'https://github.com/org/repo',
			sortOrder: 7
		},
		{
			name: 'extra_links',
			label: 'Extra Links',
			type: 'json',
			helpText: 'Array of { label, href } objects (for non-GitHub links)',
			sortOrder: 8
		},
		{
			name: 'tasks',
			label: 'Tasks',
			type: 'tasklist',
			helpText: 'Check off tasks as they are completed',
			sortOrder: 9
		},
		{
			name: 'blockers',
			label: 'Blockers / Notes',
			type: 'textarea',
			placeholder: 'Any current blockers or notes...',
			sortOrder: 10
		},
		{
			name: 'sort_order',
			label: 'Sort Order',
			type: 'number',
			helpText: 'Display order within group (lower = first)',
			sortOrder: 11
		}
	],
	settings: {
		hasDrafts: false,
		hasTags: false,
		hasSEO: false,
		hasAuthor: false,
		isPublic: true,
		routePrefix: '/projects',
		listPageSize: 100,
		defaultSort: 'created_at',
		defaultSortDirection: 'asc'
	}
};

export const contentTypeRegistry: ContentTypeDefinition[] = [blogContentType, openProjectsContentType];

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
