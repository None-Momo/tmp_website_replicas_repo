import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
	StayScapeSavedSearch,
	findSavedSearch,
	formatBudget,
	formatSavedSearchDate,
	loadSavedSearches,
	SAVED_SEARCHES_STORAGE_KEY,
} from './StayScape_savedsearch_data';
import { useStorageRefresh } from '../utils/useStorageRefresh';

export const SAVED_SEARCHES_PATH = '/stayscape_saved';
export const savedSearchPath = (id: string) => `${SAVED_SEARCHES_PATH}/${encodeURIComponent(id)}`;
export const savedSearchEditPath = (id: string) => `${savedSearchPath(id)}/edit`;

// Button-styled links/buttons, matching the pink-600 primary action used on
// the rest of StayScape (pink-600 on white clears the 4.5:1 AA minimum).
export const PRIMARY_ACTION_CLASS =
	'inline-block bg-pink-600 text-white font-medium rounded-lg px-5 py-2 hover:bg-pink-700';
export const SECONDARY_ACTION_CLASS =
	'inline-block bg-white text-gray-800 font-medium rounded-lg px-5 py-2 border border-gray-400 hover:bg-gray-100';
export const TEXT_LINK_CLASS = 'text-pink-700 underline hover:text-pink-800';

/** Moves keyboard focus to the returned element once, when the page mounts. */
export function useFocusOnMount<T extends HTMLElement>() {
	const ref = useRef<T>(null);
	useEffect(() => {
		ref.current?.focus();
	}, []);
	return ref;
}

// Shared chrome for the saved-search pages. The brand is a link here, not the
// page's h1 as on the home page, so that each page's h1 names the page itself
// and screen reader users land on a meaningful heading.
export const StayScapeSavedSearchHeader: React.FC<{ current?: 'saved' }> = ({ current }) => (
	<header className="bg-white shadow-sm border-b border-gray-200">
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
			<Link to="/stayscape" className="text-2xl font-bold text-pink-500">StayScape</Link>
			<nav aria-label="StayScape" className="flex space-x-6">
				<Link to="/stayscape" className="text-gray-700 hover:text-pink-500">Places to stay</Link>
				<Link
					to={SAVED_SEARCHES_PATH}
					aria-current={current === 'saved' ? 'page' : undefined}
					className={current === 'saved' ? 'text-pink-700 font-semibold' : 'text-gray-700 hover:text-pink-500'}
				>
					Saved searches
				</Link>
			</nav>
		</div>
	</header>
);

export const StayScapeSavedSearchPage: React.FC<{ current?: 'saved'; children: React.ReactNode }> = ({ current, children }) => (
	<div className="min-h-screen bg-gray-50">
		<StayScapeSavedSearchHeader current={current} />
		<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
	</div>
);

/**
 * The conditions of one saved search as a description list. The labels are
 * the same words as the edit form's field labels so the two views line up.
 */
export const SavedSearchSummary: React.FC<{ search: StayScapeSavedSearch; detailed?: boolean }> = ({ search, detailed = false }) => (
	<dl className="space-y-1 text-gray-700">
		{detailed && (
			<div><dt className="inline font-semibold">Search name: </dt><dd className="inline">{search.name}</dd></div>
		)}
		<div><dt className="inline font-semibold">Destination: </dt><dd className="inline">{search.destination}</dd></div>
		<div>
			<dt className="inline font-semibold">Check-in date: </dt>
			<dd className="inline"><time dateTime={search.checkIn}>{formatSavedSearchDate(search.checkIn)}</time></dd>
		</div>
		<div>
			<dt className="inline font-semibold">Check-out date: </dt>
			<dd className="inline"><time dateTime={search.checkOut}>{formatSavedSearchDate(search.checkOut)}</time></dd>
		</div>
		<div>
			<dt className="inline font-semibold">Maximum budget: </dt>
			<dd className="inline">{formatBudget(search.maxBudget, search.currency)}</dd>
		</div>
		{detailed && (
			<div><dt className="inline font-semibold">Currency: </dt><dd className="inline">{search.currency}</dd></div>
		)}
	</dl>
);

export const SavedSearchNotFound: React.FC = () => {
	const headingRef = useFocusOnMount<HTMLHeadingElement>();
	return (
		<StayScapeSavedSearchPage current="saved">
			<h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-4">Saved search not found</h1>
			<p className="text-gray-700 mb-4">There is no saved search at this address.</p>
			<Link to={SAVED_SEARCHES_PATH} className={TEXT_LINK_CLASS}>Back to saved searches</Link>
		</StayScapeSavedSearchPage>
	);
};

/** /stayscape_saved: every saved search with its conditions and actions. */
const SavedSearchesList: React.FC = () => {
	const [searches] = useState(() => loadSavedSearches());
	const headingRef = useFocusOnMount<HTMLHeadingElement>();
	const count = searches.length;

	return (
		<StayScapeSavedSearchPage current="saved">
			<h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-2">Saved searches</h1>
			<p className="text-gray-600 mb-6">
				{count === 0 ? 'You have no saved searches.' : count === 1 ? 'You have 1 saved search.' : `You have ${count} saved searches.`}
			</p>
			{count > 0 && (
				<ul className="list-none p-0 space-y-4">
					{searches.map((search) => (
						<li key={search.id}>
							<article
								aria-labelledby={`saved-search-${search.id}-name`}
								className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
							>
								<h2 id={`saved-search-${search.id}-name`} className="text-xl font-semibold text-gray-900 mb-3">
									{search.name}
								</h2>
								<SavedSearchSummary search={search} />
								<div className="mt-4 flex flex-wrap gap-3">
									<Link
										to={savedSearchPath(search.id)}
										aria-label={`View details for ${search.name}`}
										className={PRIMARY_ACTION_CLASS}
									>
										View details
									</Link>
									<Link
										to={savedSearchEditPath(search.id)}
										aria-label={`Edit ${search.name}`}
										className={SECONDARY_ACTION_CLASS}
									>
										Edit
									</Link>
								</div>
							</article>
						</li>
					))}
				</ul>
			)}
		</StayScapeSavedSearchPage>
	);
};

/** Re-reads storage when it changed in another tab or the page came back from the back-forward cache. */
const StayScapeSavedSearches: React.FC = () => <SavedSearchesList key={useStorageRefresh(SAVED_SEARCHES_STORAGE_KEY)} />;

export default StayScapeSavedSearches;

/** /stayscape_saved/:id: the persisted conditions of one saved search. */
export const StayScapeSavedSearchDetails: React.FC = () => <SavedSearchDetails key={useStorageRefresh(SAVED_SEARCHES_STORAGE_KEY)} />;

const SavedSearchDetails: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const location = useLocation();
	const navigate = useNavigate();
	const [search] = useState(() => findSavedSearch(id));
	const headingRef = useFocusOnMount<HTMLHeadingElement>();

	// The edit page hands over its confirmation in navigation state. It is
	// captured once at mount and the history entry is cleared, so the message
	// is announced once and does not come back on refresh or Back.
	const statusFromNavigation = (location.state as { statusMessage?: string } | null)?.statusMessage ?? '';
	const [pendingStatus] = useState(statusFromNavigation);
	const [statusMessage, setStatusMessage] = useState('');
	useEffect(() => {
		if (!pendingStatus) return;
		// The live region is rendered empty first; filling it a moment later
		// makes screen readers treat the text as an update and announce it.
		const timer = setTimeout(() => setStatusMessage(pendingStatus), 150);
		return () => clearTimeout(timer);
	}, [pendingStatus]);
	useEffect(() => {
		if (statusFromNavigation) navigate(location.pathname, { replace: true, state: null });
	}, [statusFromNavigation, location.pathname, navigate]);

	if (!search) return <SavedSearchNotFound />;

	return (
		<StayScapeSavedSearchPage current="saved">
			<p className="text-sm uppercase tracking-wide text-gray-600 mb-1">Saved search</p>
			<h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-4">{search.name}</h1>
			<div
				role="status"
				aria-live="polite"
				className={statusMessage ? 'mb-6 rounded-lg border border-green-300 bg-green-50 text-green-900 px-4 py-3' : undefined}
			>
				{statusMessage}
			</div>
			<section aria-labelledby="saved-search-conditions-heading" className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
				<h2 id="saved-search-conditions-heading" className="text-xl font-semibold text-gray-900 mb-3">Search conditions</h2>
				<SavedSearchSummary search={search} detailed />
			</section>
			<div className="mt-6 flex flex-wrap gap-3">
				<Link to={savedSearchEditPath(search.id)} aria-label={`Edit ${search.name}`} className={PRIMARY_ACTION_CLASS}>
					Edit
				</Link>
				<Link to={SAVED_SEARCHES_PATH} className={SECONDARY_ACTION_CLASS}>Back to saved searches</Link>
			</div>
		</StayScapeSavedSearchPage>
	);
};
