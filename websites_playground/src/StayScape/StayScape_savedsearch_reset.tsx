import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { INITIAL_SAVED_SEARCHES, SAVED_SEARCHES_STORAGE_KEY, StayScapeSavedSearch, formatBudget, loadSavedSearches, resetSavedSearches } from './StayScape_savedsearch_data';
import { useStorageRefresh } from '../utils/useStorageRefresh';
import { getStudyInitRecord } from './StayScape_study_init';
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
const matchesInitial = (searches: StayScapeSavedSearch[]) =>
	JSON.stringify(searches) === JSON.stringify(INITIAL_SAVED_SEARCHES);

export const StayScapeSavedSearchReset: React.FC = () => <SavedSearchReset key={useStorageRefresh(SAVED_SEARCHES_STORAGE_KEY)} />;

const SavedSearchReset: React.FC = () => {
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

			{/* Readiness for the next Task 1 run, in words (not colour alone). */}
			<section aria-labelledby="reset-readiness-heading" className={`mb-6 rounded-lg border-2 px-4 py-3 ${matchesInitial(searches) ? 'border-green-600 bg-green-50 text-green-900' : 'border-amber-600 bg-amber-50 text-amber-900'}`}>
				<h2 id="reset-readiness-heading" className="text-lg font-semibold">Task 1 readiness</h2>
				{matchesInitial(searches) ? (
					<p>Ready: the saved searches match the initial state. {searches[0].name} has a maximum budget of {formatBudget(searches[0].maxBudget, searches[0].currency)}.</p>
				) : (
					<p>
						Not ready: the saved searches differ from the initial state.
						{searches[0] ? ` ${searches[0].name} has a maximum budget of ${formatBudget(searches[0].maxBudget, searches[0].currency)}.` : ''}
						{' '}Press the reset button below.
					</p>
				)}
				<p className="mt-1 text-sm">After resetting, close any StayScape tabs left from the previous run and open the task's start page in a new tab. Do not use Back.</p>
				<p className="mt-1 text-sm">
					{(() => {
						const rec = getStudyInitRecord('stayscape_saved_01');
						return rec
							? `Automatic initialization: the last new run was "${rec.lastRunId}" at ${new Date(rec.lastInitializedAt).toLocaleString('en-US')} (${rec.runIds.length} run IDs remembered on this browser).`
							: 'Automatic initialization: no MORPH run has been initialized on this browser yet.';
					})()}
				</p>
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
