import { useEffect, useState } from 'react';

/**
 * A number that changes whenever the page's copy of a localStorage entry may
 * be out of date, so a page can re-read storage by using it as a React key:
 *
 * - another tab or window of the same origin changed `key` (a "storage"
 *   event; it never fires for the tab's own writes), or
 * - the browser restored this page from its back-forward cache (pageshow
 *   with persisted = true), e.g. after a reset in the same tab and Back.
 *
 * Pages read storage once when they mount, so without this they kept showing
 * values from before a reset done elsewhere.
 */
export function useStorageRefresh(key: string): number {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		const bump = () => setVersion((v) => v + 1);
		const onStorage = (e: StorageEvent) => {
			if (e.key === key || e.key === null) bump(); // null: storage was cleared
		};
		const onPageShow = (e: PageTransitionEvent) => {
			if (e.persisted) bump();
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener('pageshow', onPageShow);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('pageshow', onPageShow);
		};
	}, [key]);
	return version;
}
