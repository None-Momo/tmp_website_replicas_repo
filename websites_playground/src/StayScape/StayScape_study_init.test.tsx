import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ScapeStay from './StayScape_index';
import StayScapeSavedSearches, { StayScapeSavedSearchDetails } from './StayScape_savedsearches';
import { StayScapeSavedSearchEdit } from './StayScape_savedsearch_edit';
import { StayScapeSavedSearchReset } from './StayScape_savedsearch_reset';
import { INITIAL_SAVED_SEARCHES, loadSavedSearches, updateSavedSearch } from './StayScape_savedsearch_data';
import { MAX_REMEMBERED_RUNS, STUDY_INIT_STORAGE_KEY, applyStudyInit, getStudyInitRecord } from './StayScape_study_init';
import { ITINERARY_STORAGE_KEY, loadItinerary, setItineraryStay } from '../itinerary/itinerary_data';

const SEATTLE = INITIAL_SAVED_SEARCHES[0];
const TO_180 = { name: SEATTLE.name, destination: SEATTLE.destination, checkIn: SEATTLE.checkIn, checkOut: SEATTLE.checkOut, maxBudget: 180 };
const initUrl = (runId: string) => `/stayscape?study_init=stayscape_saved_01&study_run_id=${runId}`;
const budget = () => loadSavedSearches()[0].maxBudget;

beforeEach(() => window.localStorage.clear());

const renderAt = (path: string) => render(
	<MemoryRouter initialEntries={[path]}>
		<Routes>
			<Route path="/stayscape" element={<ScapeStay />} />
			<Route path="/stayscape_saved" element={<StayScapeSavedSearches />} />
			<Route path="/stayscape_saved/:id" element={<StayScapeSavedSearchDetails />} />
			<Route path="/stayscape_saved/:id/edit" element={<StayScapeSavedSearchEdit />} />
			<Route path="/stayscape_study_reset" element={<StayScapeSavedSearchReset />} />
		</Routes>
	</MemoryRouter>
);
const shownBudget = () => within(screen.getByRole('region', { name: 'Search conditions' })).getByText(/^\$\d+$/).textContent;

test('Run A then Run B through the pages', async () => {
	// A leftover $180 from an earlier run, plus Task 2 data that must survive.
	updateSavedSearch(SEATTLE.id, TO_180);
	setItineraryStay({ listingSlug: 'x', name: 'Keep me', destination: 'Los Angeles', area: 'X', checkIn: '2026-12-11', checkOut: '2026-12-15', nights: 4, guests: 1, nightlyPrice: 1, totalPrice: 4, amenities: [] });
	const itineraryBefore = window.localStorage.getItem(ITINERARY_STORAGE_KEY);

	// Run A: the start URL restores $220 before the page is shown.
	let view = renderAt(initUrl('run-a'));
	expect(budget()).toBe(220);
	userEvent.click(screen.getByRole('link', { name: 'Saved searches' }));
	userEvent.click(screen.getByRole('link', { name: 'Edit Seattle Winter Trip' }));
	expect(screen.getByLabelText('Maximum budget')).toHaveValue(220);
	fireEvent.change(screen.getByLabelText('Maximum budget'), { target: { value: '180' } });
	userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
	expect(await screen.findByText('Changes to Seattle Winter Trip were saved.')).toBeInTheDocument();
	userEvent.click(screen.getByRole('link', { name: 'Back to saved searches' }));
	userEvent.click(screen.getByRole('link', { name: 'View details for Seattle Winter Trip' }));
	expect(shownBudget()).toBe('$180');
	view.unmount(); // refresh
	view = renderAt('/stayscape_saved/seattle-winter-trip');
	expect(shownBudget()).toBe('$180');
	view.unmount(); // revisit the same start URL
	view = renderAt(initUrl('run-a'));
	expect(budget()).toBe(180);
	view.unmount();

	// Run B: a new id restores $220 with the other conditions intact.
	view = renderAt(initUrl('run-b'));
	expect(loadSavedSearches()).toEqual([SEATTLE]);
	userEvent.click(screen.getByRole('link', { name: 'Saved searches' }));
	userEvent.click(screen.getByRole('link', { name: 'View details for Seattle Winter Trip' }));
	const conditions = screen.getByRole('region', { name: 'Search conditions' });
	for (const t of ['Seattle Winter Trip', 'Seattle', 'December 10, 2026', 'December 15, 2026', '$220']) {
		expect(within(conditions).getByText(t)).toBeInTheDocument();
	}
	expect(window.localStorage.getItem(ITINERARY_STORAGE_KEY)).toBe(itineraryBefore);
	expect(loadItinerary().stay?.name).toBe('Keep me');
	view.unmount();
});

test('visits that are not a new run never reset', () => {
	updateSavedSearch(SEATTLE.id, TO_180);
	for (const path of [
		'/stayscape',
		'/stayscape?study_init=stayscape_saved_01',
		'/stayscape?study_run_id=run-x',
		'/stayscape?study_init=stayscape_saved_01&study_run_id=',
		'/stayscape?study_init=some_other_task&study_run_id=run-x',
		'/stayscape_saved?study_init=stayscape_saved_01&study_run_id=run-y',
		'/stayscape_saved/seattle-winter-trip?study_init=stayscape_saved_01&study_run_id=run-z',
	]) {
		const view = renderAt(path);
		expect(budget()).toBe(180);
		view.unmount();
	}
	expect(window.localStorage.getItem(STUDY_INIT_STORAGE_KEY)).toBeNull();
});

test('registry: results, record, and bounded memory', () => {
	expect(applyStudyInit('?study_init=stayscape_saved_01&study_run_id=r1', new Date('2026-11-16T10:00:00Z'))).toEqual({ status: 'initialized', taskId: 'stayscape_saved_01', runId: 'r1' });
	updateSavedSearch(SEATTLE.id, TO_180);
	expect(applyStudyInit('?study_init=stayscape_saved_01&study_run_id=r1')).toEqual({ status: 'already-initialized', taskId: 'stayscape_saved_01', runId: 'r1' });
	expect(budget()).toBe(180);
	expect(getStudyInitRecord('stayscape_saved_01')).toEqual({ runIds: ['r1'], lastRunId: 'r1', lastInitializedAt: '2026-11-16T10:00:00.000Z' });
	for (let i = 0; i < MAX_REMEMBERED_RUNS + 5; i++) applyStudyInit(`?study_init=stayscape_saved_01&study_run_id=bulk-${i}`);
	const rec = getStudyInitRecord('stayscape_saved_01')!;
	expect(rec.runIds).toHaveLength(MAX_REMEMBERED_RUNS);
	expect(rec.lastRunId).toBe(`bulk-${MAX_REMEMBERED_RUNS + 4}`);
	expect(applyStudyInit('?study_init=nope&study_run_id=r1')).toEqual({ status: 'unknown-task', taskId: 'nope' });
	window.localStorage.setItem(STUDY_INIT_STORAGE_KEY, 'not json');
	expect(applyStudyInit('?study_init=stayscape_saved_01&study_run_id=after-corruption').status).toBe('initialized');
});

test('the manual reset page still works and shows the last automatic run', () => {
	applyStudyInit('?study_init=stayscape_saved_01&study_run_id=run-b');
	updateSavedSearch(SEATTLE.id, TO_180);
	renderAt('/stayscape_study_reset');
	expect(screen.getByRole('region', { name: 'Task 1 readiness' })).toHaveTextContent('the last new run was "run-b"');
	userEvent.click(screen.getByRole('button', { name: 'Reset saved searches to initial state' }));
	expect(budget()).toBe(220);
});
