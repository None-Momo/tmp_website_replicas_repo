import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ItineraryPage, ItineraryResetPage } from './itinerary_page';
import {
	ITINERARY_STORAGE_KEY,
	ItineraryFlight,
	ItineraryStay,
	loadItinerary,
	resetItinerary,
	setItineraryFlight,
	setItineraryStay,
} from './itinerary_data';
import { SAVED_SEARCHES_STORAGE_KEY, loadSavedSearches, resetSavedSearches, updateSavedSearch } from '../StayScape/StayScape_savedsearch_data';

const FLIGHT: ItineraryFlight = {
	airline: 'Spirit', flightNumber: 'NK 1234', departureAirport: 'ORD', departureCity: 'Chicago', arrivalAirport: 'LAX', arrivalCity: 'Los Angeles',
	departureDate: '2026-12-10', departureTime: '9:25 PM', arrivalDate: '2026-12-11', arrivalTime: '12:01 AM', duration: '4 hr 36 min', stops: 0, price: 150,
};
const STAY: ItineraryStay = {
	listingSlug: 'sunny-santa-monica-studio-near-the-pier', name: 'Sunny Santa Monica Studio Near the Pier', destination: 'Los Angeles', area: 'Santa Monica',
	checkIn: '2026-12-11', checkOut: '2026-12-15', nights: 4, guests: 1, nightlyPrice: 168, totalPrice: 672, amenities: ['Wi-Fi', 'Parking'],
};

beforeEach(() => window.localStorage.clear());

const renderPage = (path = '/itinerary') => render(
	<MemoryRouter initialEntries={[path]}>
		<Routes>
			<Route path="/itinerary" element={<ItineraryPage />} />
			<Route path="/itinerary_study_reset" element={<ItineraryResetPage />} />
		</Routes>
	</MemoryRouter>
);

test('starts empty and records, replaces and removes entries', () => {
	expect(loadItinerary()).toEqual({ flight: null, stay: null });
	expect(setItineraryFlight(FLIGHT)).toEqual({ ok: true, replaced: false });
	expect(setItineraryStay(STAY)).toEqual({ ok: true, replaced: false });
	expect(setItineraryFlight({ ...FLIGHT, flightNumber: 'NK 999' })).toEqual({ ok: true, replaced: true });
	expect(loadItinerary()).toEqual({ flight: { ...FLIGHT, flightNumber: 'NK 999' }, stay: STAY });
});

test('the page shows the recorded values and removal keeps focus in the section', () => {
	setItineraryFlight(FLIGHT);
	setItineraryStay(STAY);
	renderPage();
	expect(screen.getByRole('heading', { level: 1, name: 'Your trip itinerary' })).toHaveFocus();
	const flight = screen.getByRole('region', { name: 'Flight' });
	for (const t of ['NK 1234', 'Chicago (ORD)', 'Los Angeles (LAX)', 'Thursday, December 10, 2026', '9:25 PM', 'Friday, December 11, 2026', '12:01 AM']) {
		expect(within(flight).getByText(t)).toBeInTheDocument();
	}
	const stay = screen.getByRole('region', { name: 'Stay' });
	for (const t of ['Sunny Santa Monica Studio Near the Pier', 'Los Angeles (Santa Monica)', 'Friday, December 11, 2026', 'Tuesday, December 15, 2026', '$168', '$672', 'Wi-Fi, Parking']) {
		expect(within(stay).getByText(t)).toBeInTheDocument();
	}
	expect(within(stay).getByRole('link', { name: 'View stay details' })).toHaveAttribute('href', '/stayscape_details/sunny-santa-monica-studio-near-the-pier?location=Los%20Angeles&checkIn=2026-12-11&checkOut=2026-12-15&guests=1');
	userEvent.click(screen.getByRole('button', { name: 'Remove flight from itinerary' }));
	expect(screen.getByRole('status')).toHaveTextContent('The flight was removed from your itinerary.');
	expect(screen.getByRole('heading', { level: 2, name: 'Flight' })).toHaveFocus();
	expect(screen.getByText('No flight added yet.', { exact: false })).toBeInTheDocument();
	expect(loadItinerary()).toEqual({ flight: null, stay: STAY });
});

test('itinerary reset and saved-search reset never touch each other', () => {
	updateSavedSearch('seattle-winter-trip', { name: 'Seattle Winter Trip', destination: 'Seattle', checkIn: '2026-12-10', checkOut: '2026-12-15', maxBudget: 180 });
	setItineraryFlight(FLIGHT);
	setItineraryStay(STAY);
	window.localStorage.setItem('dynamicPageContent', 'keep');
	const saved = window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);

	renderPage('/itinerary_study_reset');
	expect(screen.getByText(/Flight: Spirit NK 1234/)).toBeInTheDocument();
	userEvent.click(screen.getByRole('button', { name: 'Reset itinerary to initial state' }));
	expect(screen.getByRole('status')).toHaveTextContent('The itinerary was reset to its initial, empty state.');
	expect(window.localStorage.getItem(ITINERARY_STORAGE_KEY)).toBeNull();
	expect(window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)).toBe(saved);
	expect(window.localStorage.getItem('dynamicPageContent')).toBe('keep');

	setItineraryStay(STAY);
	resetSavedSearches();
	expect(loadSavedSearches()[0].maxBudget).toBe(220);
	expect(loadItinerary().stay).toEqual(STAY);
	expect(resetItinerary()).toBe(true);
});

test('malformed stored data reads as empty', () => {
	window.localStorage.setItem(ITINERARY_STORAGE_KEY, '{"flight":{"airline":3},"stay":"x"}');
	expect(loadItinerary()).toEqual({ flight: null, stay: null });
	window.localStorage.setItem(ITINERARY_STORAGE_KEY, 'not json');
	expect(loadItinerary()).toEqual({ flight: null, stay: null });
});
