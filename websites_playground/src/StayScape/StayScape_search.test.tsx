import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StayScapeSearchResults from './StayScape_searchresults';
import { StayScapeDetails } from './StayScape_detials';
import ScapeStay from './StayScape_index';
import { STAYSCAPE_LISTINGS } from './StayScape_listings_data';
import {
	AMENITIES,
	checkMaxPrice,
	checkStayDates,
	filterListings,
	findListingBySlug,
	isAmenityKey,
	matchDestinations,
	readStaySearch,
	staySearchQuery,
} from './StayScape_search';
import { ITINERARY_STORAGE_KEY, loadItinerary } from '../itinerary/itinerary_data';
import { SAVED_SEARCHES_STORAGE_KEY, loadSavedSearches, updateSavedSearch } from './StayScape_savedsearch_data';

beforeEach(() => window.localStorage.clear());

const renderAt = (path: string) =>
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/stayscape" element={<ScapeStay />} />
				<Route path="/stayscape_search" element={<StayScapeSearchResults />} />
				<Route path="/stayscape_details/:slug" element={<StayScapeDetails />} />
				<Route path="/itinerary" element={<h1>Itinerary page</h1>} />
			</Routes>
		</MemoryRouter>
	);

const LA_SEARCH = '/stayscape_search?location=Los%20Angeles&checkIn=2026-12-10&checkOut=2026-12-15&guests=2';
const cardNames = () => screen.queryAllByRole('article').map((a) => within(a).getByRole('heading', { level: 3 }).textContent);

describe('catalog integrity', () => {
	test('slugs and ids are unique, amenities valid, prices positive', () => {
		expect(new Set(STAYSCAPE_LISTINGS.map((l) => l.slug)).size).toBe(STAYSCAPE_LISTINGS.length);
		expect(new Set(STAYSCAPE_LISTINGS.map((l) => l.id)).size).toBe(STAYSCAPE_LISTINGS.length);
		for (const l of STAYSCAPE_LISTINGS) {
			expect(l.nightlyPrice).toBeGreaterThan(0);
			expect(l.amenities.every(isAmenityKey)).toBe(true);
		}
	});
	test('every scraped listing keeps its legacy slug and old links resolve', () => {
		const scraped = STAYSCAPE_LISTINGS.filter((l) => l.city === 'Honolulu' || l.city === 'New York');
		expect(scraped).toHaveLength(48);
		expect(scraped.every((l) => l.legacySlug)).toBe(true);
		expect(findListingBySlug(STAYSCAPE_LISTINGS, 'superhostsuperhostapartment-in-waikikiwonderful-up')?.name)
			.toBe('Wonderful, Updated, Waikiki Condo at Aloha Surf!');
	});
	test('a listing whose name advertises parking or a pool lists it', () => {
		const parking = STAYSCAPE_LISTINGS.filter((l) => /parking/i.test(l.name));
		const pool = STAYSCAPE_LISTINGS.filter((l) => /\bpool\b/i.test(l.name));
		expect(parking.length).toBeGreaterThan(0);
		expect(parking.filter((l) => !l.amenities.includes('parking'))).toEqual([]);
		expect(pool.filter((l) => !l.amenities.includes('pool'))).toEqual([]);
	});
});

describe('search logic', () => {
	test('destination matching never substitutes another city', () => {
		expect(matchDestinations('Los Angeles')).toEqual(['Los Angeles']);
		expect(matchDestinations('Los Angeles, CA')).toEqual(['Los Angeles']);
		expect(matchDestinations('Los Angeles (LAX)')).toEqual(['Los Angeles']);
		expect(matchDestinations('LA')).toEqual(['Los Angeles']);
		expect(matchDestinations('la jolla')).toEqual([]);
		expect(matchDestinations('New York (JFK)')).toEqual(['New York']);
		expect(matchDestinations('NYC')).toEqual(['New York']);
		expect(matchDestinations('Singapore (SIN)')).toEqual(['Singapore']);
		expect(matchDestinations('Waikiki')).toEqual(['Honolulu']);
		expect(matchDestinations('Seattle')).toEqual([]);
		expect(matchDestinations('Chicago')).toEqual([]);
		expect(matchDestinations('')).toEqual([]);
	});
	test('dates: none, valid with nights, or invalid with messages', () => {
		expect(checkStayDates('', '')).toEqual({ status: 'none' });
		expect(checkStayDates('2026-12-10', '2026-12-15')).toEqual({ status: 'valid', nights: 5 });
		expect(checkStayDates('2026-12-31', '2027-01-02')).toEqual({ status: 'valid', nights: 2 });
		expect(checkStayDates('2026-12-15', '2026-12-10')).toMatchObject({ status: 'invalid', checkOutError: 'Check-out must be after check-in.' });
		expect(checkStayDates('2026-12-10', '2026-12-10')).toMatchObject({ status: 'invalid', checkOutError: 'Check-out must be after check-in.' });
		expect(checkStayDates('2026-12-10', '')).toMatchObject({ status: 'invalid', checkOutError: 'Enter a check-out date.' });
	});
	test('maximum price', () => {
		expect(checkMaxPrice('')).toEqual({ status: 'none' });
		expect(checkMaxPrice('180')).toEqual({ status: 'valid', value: 180 });
		expect(checkMaxPrice('0').status).toBe('invalid');
		expect(checkMaxPrice('180.5').status).toBe('invalid');
		expect(checkMaxPrice('-3').status).toBe('invalid');
	});
	test('filters: city, price ceiling inclusive, and every selected amenity', () => {
		const la = filterListings(STAYSCAPE_LISTINGS, ['Los Angeles'], null, []);
		expect(la.length).toBe(12);
		const r = filterListings(STAYSCAPE_LISTINGS, ['Los Angeles'], 180, ['wifi', 'parking']);
		expect(r.length).toBeGreaterThan(0);
		expect(r.length).toBeLessThan(la.length);
		for (const l of r) {
			expect(l.city).toBe('Los Angeles');
			expect(l.nightlyPrice).toBeLessThanOrEqual(180);
			expect(l.amenities).toEqual(expect.arrayContaining(['wifi', 'parking']));
		}
		const exact = la.find((l) => l.nightlyPrice === 168)!;
		expect(filterListings(STAYSCAPE_LISTINGS, ['Los Angeles'], 168, []).map((l) => l.id)).toContain(exact.id);
	});
	test('query string round trip', () => {
		const s = { location: 'Los Angeles', checkIn: '2026-12-10', checkOut: '2026-12-15', guests: 2, maxPrice: '180', amenities: ['parking', 'wifi'] as const };
		const q = staySearchQuery({ ...s, amenities: [...s.amenities] });
		expect(q).toBe('location=Los%20Angeles&checkIn=2026-12-10&checkOut=2026-12-15&guests=2&maxPrice=180&amenities=wifi%2Cparking');
		expect(readStaySearch(new URLSearchParams(q))).toEqual({ ...s, amenities: ['wifi', 'parking'] });
	});
});

describe('results page', () => {
	test('Los Angeles search shows only LA stays with per-night and total prices', () => {
		renderAt(LA_SEARCH);
		expect(screen.getByText('Showing 12 of 12 stays in Los Angeles.')).toBeInTheDocument();
		expect(screen.getByText(/check-in Thursday, December 10, 2026, check-out Tuesday, December 15, 2026, 5 nights, 2 guests/)).toBeInTheDocument();
		const card = screen.getByRole('article', { name: 'Sunny Santa Monica Studio Near the Pier' });
		expect(within(card).getByText('$168')).toBeInTheDocument();
		expect(within(card).getByText('$840 total for 5 nights')).toBeInTheDocument();
		expect(within(card).getByText(/Wi-Fi, Parking, Air conditioning/)).toBeInTheDocument();
		expect(screen.queryByText(/Waikiki/)).not.toBeInTheDocument();
	});
	test('budget and amenity filters narrow the results and stay in the URL', () => {
		renderAt(LA_SEARCH);
		fireEvent.change(screen.getByLabelText('Maximum price per night (USD)'), { target: { value: '180' } });
		const priced = cardNames().length;
		expect(priced).toBeLessThan(12);
		userEvent.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }));
		userEvent.click(screen.getByRole('checkbox', { name: 'Parking' }));
		expect(screen.getByRole('checkbox', { name: 'Wi-Fi' })).toBeChecked();
		const expected = filterListings(STAYSCAPE_LISTINGS, ['Los Angeles'], 180, ['wifi', 'parking']).map((l) => l.name);
		expect(cardNames()).toEqual(expected);
		expect(screen.getByText(`Showing ${expected.length} of 12 stays in Los Angeles.`)).toBeInTheDocument();
		expect(screen.getByText('Filters: up to $180 per night; must have Wi-Fi and Parking.')).toBeInTheDocument();
		const link = screen.getByRole('link', { name: `View details for ${expected[0]}` });
		expect(link.getAttribute('href')).toMatch(/checkIn=2026-12-10&checkOut=2026-12-15&guests=2&maxPrice=180&amenities=wifi%2Cparking$/);
		userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
		expect(cardNames()).toHaveLength(12);
	});
	test('typing the price key by key and ticking boxes in a row keeps every change', () => {
		renderAt(LA_SEARCH);
		const price = screen.getByLabelText('Maximum price per night (USD)');
		userEvent.type(price, '180');
		expect(price).toHaveValue(180);
		userEvent.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }));
		userEvent.click(screen.getByRole('checkbox', { name: 'Parking' }));
		expect(screen.getByRole('checkbox', { name: 'Wi-Fi' })).toBeChecked();
		expect(screen.getByRole('checkbox', { name: 'Parking' })).toBeChecked();
		expect(cardNames()).toEqual(filterListings(STAYSCAPE_LISTINGS, ['Los Angeles'], 180, ['wifi', 'parking']).map((l) => l.name));
	});
	test('filters that exclude everything say so', () => {
		renderAt(`${LA_SEARCH}&maxPrice=50`);
		expect(screen.getByText('No matching accommodations found. None of the 12 stays in Los Angeles match your filters.')).toBeInTheDocument();
		expect(screen.queryAllByRole('article')).toHaveLength(0);
	});
	test('an invalid price is reported and not applied', () => {
		renderAt(`${LA_SEARCH}&maxPrice=0`);
		expect(screen.getByLabelText('Maximum price per night (USD)')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByText(/The maximum price must be at least \$1\. The price filter is not applied\./)).toBeInTheDocument();
		expect(cardNames()).toHaveLength(12);
	});
	test('unsupported destinations return no listings instead of another city', () => {
		renderAt('/stayscape_search?location=Seattle&checkIn=2026-12-10&checkOut=2026-12-15&guests=1');
		expect(screen.getByText(/^No matching accommodations found for "Seattle"\./)).toBeInTheDocument();
		expect(screen.queryAllByRole('article')).toHaveLength(0);
	});
	test('the results-page search rejects check-out before check-in', () => {
		renderAt(LA_SEARCH);
		fireEvent.change(screen.getByLabelText('Check-out date'), { target: { value: '2026-12-09' } });
		userEvent.click(screen.getByRole('button', { name: 'Search' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Check-out must be after check-in.');
		expect(screen.getByLabelText('Check-out date')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByText(/check-out Tuesday, December 15, 2026/)).toBeInTheDocument();
	});
});

describe('home page', () => {
	test('reports missing and out-of-order dates on the page instead of alert()', () => {
		const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
		renderAt('/stayscape');
		userEvent.click(screen.getByRole('button', { name: 'Search' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Enter a destination.');
		userEvent.type(screen.getByLabelText('Destination'), 'Los Angeles');
		fireEvent.change(screen.getByLabelText('Check in'), { target: { value: '2026-12-15' } });
		fireEvent.change(screen.getByLabelText('Check out'), { target: { value: '2026-12-10' } });
		userEvent.click(screen.getByRole('button', { name: 'Search' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Check-out must be after check-in.');
		expect(alertSpy).not.toHaveBeenCalled();
		fireEvent.change(screen.getByLabelText('Check out'), { target: { value: '2026-12-18' } });
		userEvent.click(screen.getByRole('button', { name: 'Search' }));
		expect(screen.getByText('Showing 12 of 12 stays in Los Angeles.')).toBeInTheDocument();
		alertSpy.mockRestore();
	});
	test('a new search starts empty even after the saved search was edited (Task 1 isolation)', () => {
		updateSavedSearch('seattle-winter-trip', { name: 'Seattle Winter Trip', destination: 'Seattle', checkIn: '2026-12-10', checkOut: '2026-12-15', maxBudget: 180 });
		renderAt('/stayscape');
		expect(screen.getByLabelText('Destination')).toHaveValue('');
		expect(screen.getByLabelText('Check in')).toHaveValue('');
		expect(screen.getByLabelText('Check out')).toHaveValue('');
	});
});

describe('details page', () => {
	const slug = 'sunny-santa-monica-studio-near-the-pier';
	test('shows the stay dates and adds the stay to the itinerary', () => {
		renderAt(`/stayscape_details/${slug}?location=Los%20Angeles&checkIn=2026-12-10&checkOut=2026-12-15&guests=2&maxPrice=180`);
		expect(screen.getByRole('heading', { level: 2, name: 'Sunny Santa Monica Studio Near the Pier' })).toHaveFocus();
		expect(screen.getByLabelText('Check-in date')).toHaveValue('2026-12-10');
		expect(screen.getByLabelText('Check-out date')).toHaveValue('2026-12-15');
		expect(screen.getByText('$840 total')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Back to search results' })).toHaveAttribute('href', expect.stringContaining('maxPrice=180'));
		userEvent.click(screen.getByRole('button', { name: 'Add to itinerary' }));
		expect(screen.getByRole('status')).toHaveTextContent('Added Sunny Santa Monica Studio Near the Pier, check-in Thursday, December 10, 2026, check-out Tuesday, December 15, 2026, to your itinerary.');
		expect(loadItinerary().stay).toEqual({
			listingSlug: slug, name: 'Sunny Santa Monica Studio Near the Pier', destination: 'Los Angeles', area: 'Santa Monica',
			checkIn: '2026-12-10', checkOut: '2026-12-15', nights: 5, guests: 2, nightlyPrice: 168, totalPrice: 840,
			amenities: ['Wi-Fi', 'Parking', 'Air conditioning'],
		});
		userEvent.click(screen.getByRole('button', { name: 'Add to itinerary' }));
		expect(screen.getByRole('status')).toHaveTextContent(/^Your itinerary's stay was replaced with/);
	});
	test('refuses to add a stay with invalid dates', () => {
		renderAt(`/stayscape_details/${slug}?location=Los%20Angeles&checkIn=2026-12-15&checkOut=2026-12-10&guests=1`);
		userEvent.click(screen.getByRole('button', { name: 'Add to itinerary' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Check-out must be after check-in. The stay was not added to your itinerary.');
		expect(window.localStorage.getItem(ITINERARY_STORAGE_KEY)).toBeNull();
	});
	test('old card links still open the listing', () => {
		renderAt('/stayscape_details/superhostsuperhostapartment-in-waikikiwonderful-up');
		expect(screen.getByRole('heading', { level: 2, name: 'Wonderful, Updated, Waikiki Condo at Aloha Surf!' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Finish and go to confirmation page' })).toBeInTheDocument();
	});
	test('adding a stay does not touch saved searches', () => {
		loadSavedSearches();
		const before = window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);
		renderAt(`/stayscape_details/${slug}?location=LA&checkIn=2026-12-10&checkOut=2026-12-11&guests=1`);
		userEvent.click(screen.getByRole('button', { name: 'Add to itinerary' }));
		expect(window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)).toBe(before);
	});
});

test('amenity list matches the documented set', () => {
	expect(AMENITIES.map((a) => a.label)).toEqual(['Wi-Fi', 'Parking', 'Breakfast', 'Swimming pool', 'Air conditioning']);
});
