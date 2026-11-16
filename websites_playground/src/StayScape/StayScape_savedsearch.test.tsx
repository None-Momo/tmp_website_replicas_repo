import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import StayScapeSavedSearches, { StayScapeSavedSearchDetails } from './StayScape_savedsearches';
import { StayScapeSavedSearchEdit } from './StayScape_savedsearch_edit';
import { StayScapeSavedSearchReset } from './StayScape_savedsearch_reset';
import {
	INITIAL_SAVED_SEARCHES,
	SAVED_SEARCHES_STORAGE_KEY,
	StayScapeSavedSearch,
	loadSavedSearches,
	resetSavedSearches,
	updateSavedSearch,
	validateSavedSearchForm,
} from './StayScape_savedsearch_data';

const SEATTLE = INITIAL_SAVED_SEARCHES[0];
const BUDGET_180 = {
	name: SEATTLE.name,
	destination: SEATTLE.destination,
	checkIn: SEATTLE.checkIn,
	checkOut: SEATTLE.checkOut,
	maxBudget: 180,
};

beforeEach(() => {
	window.localStorage.clear();
});

// A stand-in for the StayScape home page, with the header link the real one has.
const Home = () => (
	<div>
		<h1>StayScape home</h1>
		<Link to="/stayscape_saved">Saved searches</Link>
	</div>
);

const renderAt = (path: string) =>
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/stayscape" element={<Home />} />
				<Route path="/stayscape_saved" element={<StayScapeSavedSearches />} />
				<Route path="/stayscape_saved/:id" element={<StayScapeSavedSearchDetails />} />
				<Route path="/stayscape_saved/:id/edit" element={<StayScapeSavedSearchEdit />} />
				<Route path="/stayscape_study_reset" element={<StayScapeSavedSearchReset />} />
			</Routes>
		</MemoryRouter>
	);

const stored = (): StayScapeSavedSearch[] =>
	JSON.parse(window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY) ?? '[]');

const expectSeattleConditions = (container: HTMLElement, budget: string) => {
	expect(within(container).getByText('Seattle')).toBeInTheDocument();
	expect(within(container).getByText('December 10, 2026')).toBeInTheDocument();
	expect(within(container).getByText('December 15, 2026')).toBeInTheDocument();
	expect(within(container).getByText(budget)).toBeInTheDocument();
};

const conditionsRegion = () => screen.getByRole('region', { name: 'Search conditions' });

describe('saved search storage', () => {
	test('seeds Seattle Winter Trip with the initial values on first load', () => {
		expect(window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)).toBeNull();
		expect(loadSavedSearches()).toEqual([
			{
				id: 'seattle-winter-trip',
				name: 'Seattle Winter Trip',
				destination: 'Seattle',
				checkIn: '2026-12-10',
				checkOut: '2026-12-15',
				maxBudget: 220,
				currency: 'USD',
			},
		]);
		expect(stored()).toEqual([SEATTLE]);
	});

	test('a later load (as after a refresh) keeps an edited record instead of reseeding', () => {
		expect(updateSavedSearch(SEATTLE.id, BUDGET_180)).toEqual({ ok: true, record: { ...SEATTLE, maxBudget: 180 } });
		expect(loadSavedSearches()).toEqual([{ ...SEATTLE, maxBudget: 180 }]);
	});

	test('saving replaces the record in place and never duplicates it', () => {
		updateSavedSearch(SEATTLE.id, BUDGET_180);
		updateSavedSearch(SEATTLE.id, { ...BUDGET_180, maxBudget: 175 });
		expect(loadSavedSearches()).toEqual([{ ...SEATTLE, maxBudget: 175 }]);
	});

	test('saving one record leaves the others unchanged', () => {
		const other: StayScapeSavedSearch = {
			id: 'portland-weekend',
			name: 'Portland Weekend',
			destination: 'Portland',
			checkIn: '2027-02-05',
			checkOut: '2027-02-07',
			maxBudget: 150,
			currency: 'USD',
		};
		window.localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify([SEATTLE, other]));
		updateSavedSearch(SEATTLE.id, BUDGET_180);
		expect(loadSavedSearches()).toEqual([{ ...SEATTLE, maxBudget: 180 }, other]);
	});

	test('saving to an unknown id fails without writing', () => {
		expect(updateSavedSearch('nope', BUDGET_180)).toEqual({ ok: false, reason: 'not-found' });
		expect(loadSavedSearches()).toEqual([SEATTLE]);
	});

	test('reset restores the initial state, once or repeatedly, and touches nothing else', () => {
		window.localStorage.setItem('dynamicPageContent', '{"html":"<p>x</p>"}');
		updateSavedSearch(SEATTLE.id, BUDGET_180);
		expect(resetSavedSearches()).toBe(true);
		expect(resetSavedSearches()).toBe(true);
		expect(loadSavedSearches()).toEqual([SEATTLE]);
		expect(window.localStorage.getItem('dynamicPageContent')).toBe('{"html":"<p>x</p>"}');
	});

	test('validation accepts whole-dollar budgets and rejects bad values', () => {
		const base = { name: 'Seattle Winter Trip', destination: 'Seattle', checkIn: '2026-12-10', checkOut: '2026-12-15', maxBudget: '180' };
		expect(validateSavedSearchForm(base).changes).toEqual({ ...base, maxBudget: 180 });
		expect(validateSavedSearchForm({ ...base, maxBudget: '' }).errors.maxBudget).toBe('Enter a maximum budget.');
		expect(validateSavedSearchForm({ ...base, maxBudget: '0' }).errors.maxBudget).toMatch(/at least \$1/);
		expect(validateSavedSearchForm({ ...base, maxBudget: '-5' }).errors.maxBudget).toMatch(/whole number/);
		expect(validateSavedSearchForm({ ...base, maxBudget: '180.50' }).errors.maxBudget).toMatch(/whole number/);
		expect(validateSavedSearchForm({ ...base, maxBudget: 'abc' }).errors.maxBudget).toMatch(/whole number/);
		expect(validateSavedSearchForm({ ...base, checkOut: '2026-12-10' }).errors.checkOut).toMatch(/after the check-in/);
		expect(validateSavedSearchForm({ ...base, checkIn: '' }).errors.checkIn).toBe('Enter a check-in date.');
		expect(validateSavedSearchForm({ ...base, destination: '  ' }).errors.destination).toBe('Enter a destination.');
		expect(validateSavedSearchForm({ ...base, name: '' }).errors.name).toBe('Enter a search name.');
	});
});

describe('saved search pages', () => {
	test('the list shows Seattle Winter Trip with its conditions and distinguishable actions', () => {
		renderAt('/stayscape_saved');
		expect(screen.getByRole('heading', { level: 1, name: 'Saved searches' })).toHaveFocus();
		expect(screen.getByText('You have 1 saved search.')).toBeInTheDocument();
		const card = screen.getByRole('article', { name: 'Seattle Winter Trip' });
		expectSeattleConditions(card, '$220');
		expect(within(card).getByRole('link', { name: 'View details for Seattle Winter Trip' })).toHaveAttribute(
			'href',
			'/stayscape_saved/seattle-winter-trip'
		);
		expect(within(card).getByRole('link', { name: 'Edit Seattle Winter Trip' })).toHaveAttribute(
			'href',
			'/stayscape_saved/seattle-winter-trip/edit'
		);
		expect(screen.getByRole('link', { name: 'Saved searches' })).toHaveAttribute('aria-current', 'page');
	});

	test('edit the budget from $220 to $180, save, navigate away, reopen, verify, refresh', async () => {
		const { unmount } = renderAt('/stayscape_saved');
		userEvent.click(screen.getByRole('link', { name: 'View details for Seattle Winter Trip' }));

		// Read the existing state.
		expect(screen.getByRole('heading', { level: 1, name: 'Seattle Winter Trip' })).toHaveFocus();
		expectSeattleConditions(conditionsRegion(), '$220');
		expect(screen.getByRole('status')).toHaveTextContent('');

		// Enter edit mode: every field holds the current value and stays editable.
		userEvent.click(screen.getByRole('link', { name: 'Edit Seattle Winter Trip' }));
		expect(screen.getByRole('heading', { level: 1, name: 'Edit Seattle Winter Trip' })).toHaveFocus();
		expect(screen.getByLabelText('Search name')).toHaveValue('Seattle Winter Trip');
		expect(screen.getByLabelText('Destination')).toHaveValue('Seattle');
		expect(screen.getByLabelText('Check-in date')).toHaveValue('2026-12-10');
		expect(screen.getByLabelText('Check-out date')).toHaveValue('2026-12-15');
		const budget = screen.getByLabelText('Maximum budget');
		expect(budget).toHaveValue(220);
		for (const label of ['Search name', 'Destination', 'Check-in date', 'Check-out date', 'Maximum budget']) {
			const field = screen.getByLabelText(label);
			expect(field).toBeEnabled();
			expect(field).not.toHaveAttribute('readonly');
		}

		// Change only the budget and save.
		fireEvent.change(budget, { target: { value: '180' } });
		userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

		// The details page confirms the save and shows the persisted values.
		expect(screen.getByRole('heading', { level: 1, name: 'Seattle Winter Trip' })).toHaveFocus();
		expect(await screen.findByText('Changes to Seattle Winter Trip were saved.')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('Changes to Seattle Winter Trip were saved.');
		expectSeattleConditions(conditionsRegion(), '$180');
		expect(stored()).toEqual([{ ...SEATTLE, maxBudget: 180 }]);

		// Navigate away, return to the list, reopen.
		userEvent.click(screen.getByRole('link', { name: 'Places to stay' }));
		expect(screen.getByRole('heading', { level: 1, name: 'StayScape home' })).toBeInTheDocument();
		userEvent.click(screen.getByRole('link', { name: 'Saved searches' }));
		const card = screen.getByRole('article', { name: 'Seattle Winter Trip' });
		expectSeattleConditions(card, '$180');
		userEvent.click(within(card).getByRole('link', { name: 'View details for Seattle Winter Trip' }));
		expectSeattleConditions(conditionsRegion(), '$180');
		expect(screen.getByRole('status')).toHaveTextContent('');

		// A fresh mount (a page refresh) reads the same persisted record.
		unmount();
		renderAt('/stayscape_saved/seattle-winter-trip');
		expectSeattleConditions(conditionsRegion(), '$180');
		expect(screen.getByRole('status')).toHaveTextContent('');
		expect(stored()).toHaveLength(1);
	});

	test('cancelling an edit leaves the saved data unchanged', () => {
		renderAt('/stayscape_saved/seattle-winter-trip/edit');
		fireEvent.change(screen.getByLabelText('Maximum budget'), { target: { value: '150' } });
		fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Tacoma' } });
		userEvent.click(screen.getByRole('link', { name: 'Cancel editing' }));
		expect(screen.getByRole('heading', { level: 1, name: 'Seattle Winter Trip' })).toHaveFocus();
		expectSeattleConditions(conditionsRegion(), '$220');
		expect(stored()).toEqual([SEATTLE]);
	});

	test('destination and dates are editable too; the site does not lock them', async () => {
		renderAt('/stayscape_saved/seattle-winter-trip/edit');
		fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Portland' } });
		fireEvent.change(screen.getByLabelText('Check-in date'), { target: { value: '2026-12-11' } });
		userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
		expect(await screen.findByText('Changes to Seattle Winter Trip were saved.')).toBeInTheDocument();
		expect(stored()).toEqual([{ ...SEATTLE, destination: 'Portland', checkIn: '2026-12-11' }]);
	});

	test('invalid budgets are rejected, announced, linked to the field and not saved', () => {
		renderAt('/stayscape_saved/seattle-winter-trip/edit');
		const budget = screen.getByLabelText('Maximum budget');

		fireEvent.change(budget, { target: { value: '' } });
		userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
		const alert = screen.getByRole('alert');
		expect(alert).toHaveFocus();
		expect(alert).toHaveTextContent('There is a problem');
		expect(alert).toHaveTextContent('Enter a maximum budget.');
		expect(budget).toHaveAttribute('aria-invalid', 'true');
		expect(budget).toHaveAccessibleDescription(/Enter a maximum budget\./);
		expect(screen.getByRole('heading', { level: 1, name: 'Edit Seattle Winter Trip' })).toBeInTheDocument();
		expect(stored()).toEqual([SEATTLE]);

		fireEvent.change(budget, { target: { value: '0' } });
		userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
		expect(screen.getByRole('alert')).toHaveTextContent('The maximum budget must be at least $1.');
		expect(stored()).toEqual([SEATTLE]);

		userEvent.click(within(screen.getByRole('alert')).getByRole('link'));
		expect(budget).toHaveFocus();
	});

	test('a check-out date on or before check-in is rejected', () => {
		renderAt('/stayscape_saved/seattle-winter-trip/edit');
		fireEvent.change(screen.getByLabelText('Check-out date'), { target: { value: '2026-12-10' } });
		userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
		expect(screen.getByRole('alert')).toHaveTextContent('The check-out date must be after the check-in date.');
		expect(screen.getByLabelText('Check-out date')).toHaveAttribute('aria-invalid', 'true');
		expect(stored()).toEqual([SEATTLE]);
	});

	test('the reset page restores $220 only when its button is pressed', () => {
		updateSavedSearch(SEATTLE.id, BUDGET_180);
		renderAt('/stayscape_study_reset');
		expect(screen.getByRole('heading', { level: 1, name: 'Reset saved searches' })).toHaveFocus();
		expect(within(screen.getByRole('region', { name: 'Current saved searches' })).getByText('$180')).toBeInTheDocument();
		expect(within(screen.getByRole('region', { name: 'Initial saved searches' })).getByText('$220')).toBeInTheDocument();
		expect(stored()).toEqual([{ ...SEATTLE, maxBudget: 180 }]);

		userEvent.click(screen.getByRole('button', { name: 'Reset saved searches to initial state' }));
		expect(screen.getByRole('status')).toHaveTextContent('Saved searches were reset to their initial state.');
		expect(within(screen.getByRole('region', { name: 'Current saved searches' })).getByText('$220')).toBeInTheDocument();
		expect(stored()).toEqual([SEATTLE]);
	});

	test('an unknown saved search shows a not-found page with a way back', () => {
		renderAt('/stayscape_saved/nope');
		expect(screen.getByRole('heading', { level: 1, name: 'Saved search not found' })).toHaveFocus();
		expect(screen.getByRole('link', { name: 'Back to saved searches' })).toHaveAttribute('href', '/stayscape_saved');
	});
});

describe('stale views after a reset elsewhere', () => {
	const pageshowFromCache = () => {
		const e = new Event('pageshow');
		Object.defineProperty(e, 'persisted', { value: true });
		return e;
	};

	test('an open details page re-reads storage when another tab resets it', () => {
		updateSavedSearch(SEATTLE.id, BUDGET_180);
		renderAt('/stayscape_saved/seattle-winter-trip');
		expectSeattleConditions(conditionsRegion(), '$180');
		// Another tab resets: storage changes, then that tab's write fires "storage" here.
		resetSavedSearches();
		act(() => { window.dispatchEvent(new StorageEvent('storage', { key: SAVED_SEARCHES_STORAGE_KEY })); });
		expectSeattleConditions(conditionsRegion(), '$220');
	});

	test('a page restored from the back-forward cache re-reads storage', () => {
		updateSavedSearch(SEATTLE.id, BUDGET_180);
		renderAt('/stayscape_saved');
		expect(within(screen.getByRole('article', { name: 'Seattle Winter Trip' })).getByText('$180')).toBeInTheDocument();
		resetSavedSearches();
		act(() => { window.dispatchEvent(pageshowFromCache()); });
		expect(within(screen.getByRole('article', { name: 'Seattle Winter Trip' })).getByText('$220')).toBeInTheDocument();
	});

	test('unrelated storage keys and ordinary page shows do not remount', () => {
		renderAt('/stayscape_saved/seattle-winter-trip/edit');
		fireEvent.change(screen.getByLabelText('Maximum budget'), { target: { value: '175' } });
		act(() => {
			window.dispatchEvent(new StorageEvent('storage', { key: 'trip.itinerary' }));
			window.dispatchEvent(new Event('pageshow'));
		});
		expect(screen.getByLabelText('Maximum budget')).toHaveValue(175);
	});

	test('the reset page states readiness and the current budget', () => {
		updateSavedSearch(SEATTLE.id, BUDGET_180);
		renderAt('/stayscape_study_reset');
		const readiness = screen.getByRole('region', { name: 'Task 1 readiness' });
		expect(readiness).toHaveTextContent('Not ready: the saved searches differ from the initial state. Seattle Winter Trip has a maximum budget of $180.');
		userEvent.click(screen.getByRole('button', { name: 'Reset saved searches to initial state' }));
		expect(screen.getByRole('region', { name: 'Task 1 readiness' })).toHaveTextContent('Ready: the saved searches match the initial state. Seattle Winter Trip has a maximum budget of $220.');
	});
});
