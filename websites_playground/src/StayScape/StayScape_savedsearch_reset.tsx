import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { INITIAL_SAVED_SEARCHES, loadSavedSearches, resetSavedSearches } from './StayScape_savedsearch_data';
import {
	PRIMARY_ACTION_CLASS,
	SAVED_SEARCHES_PATH,
	SavedSearchSummary,
	StayScapeSavedSearchPage,
	TEXT_LINK_CLASS,
	useFocusOnMount,
} from './StayScape_savedsearches';

// /stayscape_study_reset: a page for study staff, not linked from anywhere on
// the site. Opening it changes nothing; the button restores the saved
// searches to their initial state. See README.md, "StayScape saved searches".
export const StayScapeSavedSearchReset: React.FC = () => {
	const [searches, setSearches] = useState(() => loadSavedSearches());
	const [status, setStatus] = useState('');
	const [failure, setFailure] = useState('');
	const headingRef = useFocusOnMount<HTMLHeadingElement>();

	const handleReset = () => {
		if (resetSavedSearches()) {
			setSearches(loadSavedSearches());
			setFailure('');
			setStatus('Saved searches were reset to their initial state.');
		} else {
			setStatus('');
			setFailure('The saved searches could not be reset because browser storage is unavailable.');
		}
	};

	return (
		<StayScapeSavedSearchPage>
			<h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-2">Reset saved searches</h1>
			<p className="text-gray-700 mb-6">
				This page is for study staff and is not linked from the rest of StayScape. The button below replaces every
				saved search with the initial set listed at the bottom of this page. Other browser data is left unchanged.
			</p>

			<section aria-labelledby="reset-current-heading" className="mb-6">
				<h2 id="reset-current-heading" className="text-xl font-semibold text-gray-900 mb-3">Current saved searches</h2>
				{searches.length === 0 ? (
					<p className="text-gray-700">There are no saved searches.</p>
				) : (
					<ul className="list-none p-0 space-y-4">
						{searches.map((search) => (
							<li key={search.id} className="bg-white border border-gray-200 rounded-lg p-4">
								<h3 className="font-semibold text-gray-900 mb-2">{search.name}</h3>
								<SavedSearchSummary search={search} detailed />
							</li>
						))}
					</ul>
				)}
			</section>

			<button type="button" onClick={handleReset} className={PRIMARY_ACTION_CLASS}>
				Reset saved searches to initial state
			</button>
			<div
				role="status"
				aria-live="polite"
				className={status ? 'mt-4 rounded-lg border border-green-300 bg-green-50 text-green-900 px-4 py-3' : 'mt-4'}
			>
				{status}
			</div>
			{failure && (
				<div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 text-red-900 px-4 py-3">{failure}</div>
			)}

			<section aria-labelledby="reset-initial-heading" className="mt-8">
				<h2 id="reset-initial-heading" className="text-xl font-semibold text-gray-900 mb-3">Initial saved searches</h2>
				<ul className="list-none p-0 space-y-4">
					{INITIAL_SAVED_SEARCHES.map((search) => (
						<li key={search.id} className="bg-white border border-gray-200 rounded-lg p-4">
							<h3 className="font-semibold text-gray-900 mb-2">{search.name}</h3>
							<SavedSearchSummary search={search} detailed />
						</li>
					))}
				</ul>
			</section>

			<p className="mt-8"><Link to={SAVED_SEARCHES_PATH} className={TEXT_LINK_CLASS}>Go to saved searches</Link></p>
		</StayScapeSavedSearchPage>
	);
};
