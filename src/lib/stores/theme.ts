import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

function getStorage() {
	if (!browser || typeof globalThis.localStorage === 'undefined') {
		return null;
	}

	const storage = globalThis.localStorage as Partial<Storage>;
	if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
		return null;
	}

	return storage;
}

function getThemeMediaQuery() {
	if (!browser || typeof window.matchMedia !== 'function') {
		return null;
	}

	return window.matchMedia('(prefers-color-scheme: dark)');
}

// Get system theme preference
function getSystemTheme(): ResolvedTheme {
	const mediaQuery = getThemeMediaQuery();
	if (mediaQuery?.matches) {
		return 'dark';
	}
	return 'light';
}

// Initialize theme preference from localStorage
function getInitialThemePreference(): ThemePreference {
	const storage = getStorage();
	if (storage) {
		const stored = storage.getItem?.('theme-preference') as ThemePreference;
		if (stored === 'light' || stored === 'dark' || stored === 'system') {
			return stored;
		}
	}
	return 'system'; // Default to system
}

// Store for user's theme preference (light, dark, or system)
export const themePreference = writable<ThemePreference>(getInitialThemePreference());

// Store for system theme (light or dark)
export const systemTheme = writable<ResolvedTheme>(getSystemTheme());

// Derived store for the actual theme to apply
export const resolvedTheme = derived(
	[themePreference, systemTheme],
	([$themePreference, $systemTheme]) => {
		if ($themePreference === 'system') {
			return $systemTheme;
		}
		return $themePreference as ResolvedTheme;
	}
);

// Subscribe to preference changes and update localStorage
if (browser) {
	const storage = getStorage();
	themePreference.subscribe((value) => {
		storage?.setItem?.('theme-preference', value);
	});

	// Listen for system theme changes
	const mediaQuery = getThemeMediaQuery();
	if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
		const handleChange = (e: MediaQueryListEvent) => {
			systemTheme.set(e.matches ? 'dark' : 'light');
		};
		mediaQuery.addEventListener('change', handleChange);
	}
}

// Legacy export for backward compatibility
export const themeStore = resolvedTheme;
