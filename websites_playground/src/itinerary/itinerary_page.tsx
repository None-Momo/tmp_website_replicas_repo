import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { useStorageRefresh } from '../utils/useStorageRefresh';
import {
	ITINERARY_STORAGE_KEY,
	Itinerary,
	loadItinerary,
	removeItineraryFlight,
	removeItineraryStay,
	resetItinerary,
} from './itinerary_data';

export const ITINERARY_PATH = '/itinerary';

export const formatItineraryDate = (iso: string) => {
	const d = parseISO(iso);
	return isValid(d) ? format(d, 'EEEE, MMMM d, yyyy') : iso;
};
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

const BUTTON = 'inline-block bg-teal-700 text-white font-medium rounded-lg px-4 py-2 hover:bg-teal-800';
const SECONDARY = 'inline-block bg-white text-gray-800 font-medium rounded-lg px-4 py-2 border border-gray-400 hover:bg-gray-100';
const LINK = 'text-teal-800 underline hover:text-teal-900';

const Row: React.FC<{ term: string; children: React.ReactNode }> = ({ term, children }) => (
	<div className="py-1"><dt className="inline font-semibold">{term}: </dt><dd className="inline">{children}</dd></div>
);

const ItineraryShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div className="min-h-screen bg-gray-50">
		<header className="bg-white border-b border-gray-200">
			<div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap justify-between items-center gap-4">
				<Link to={ITINERARY_PATH} className="text-xl font-bold text-teal-800">Trip Itinerary</Link>
				<nav aria-label="Trip planning" className="flex gap-6">
					<Link to="/flight" className="text-gray-700 hover:text-teal-800">Search flights</Link>
					<Link to="/stayscape" className="text-gray-700 hover:text-teal-800">Search stays</Link>
				</nav>
			</div>
		</header>
		<div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">{children}</div>
	</div>
);

/** /itinerary: the flight and stay recorded for the trip, read from storage. */
/** Re-reads storage when it changed in another tab or the page came back from the back-forward cache. */
export const ItineraryPage: React.FC = () => <ItinerarySummary key={useStorageRefresh(ITINERARY_STORAGE_KEY)} />;

const ItinerarySummary: React.FC = () => {
	const [itinerary, setItinerary] = useState<Itinerary>(() => loadItinerary());
	const [status, setStatus] = useState('');
	const headingRef = useRef<HTMLHeadingElement>(null);
	const flightHeadingRef = useRef<HTMLHeadingElement>(null);
	const stayHeadingRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => { headingRef.current?.focus(); }, []);

	const remove = (part: 'flight' | 'stay') => {
		const ok = part === 'flight' ? removeItineraryFlight() : removeItineraryStay();
		setItinerary(loadItinerary());
		setStatus(ok
			? `The ${part} was removed from your itinerary.`
			: `The ${part} could not be removed because browser storage is unavailable.`);
		// The Remove button disappears, so keep focus in the same section.
		(part === 'flight' ? flightHeadingRef : stayHeadingRef).current?.focus();
	};

	const { flight, stay } = itinerary;
	const stayLink = stay
		? `/stayscape_details/${encodeURIComponent(stay.listingSlug)}?${new URLSearchParams({ location: stay.destination, checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(stay.guests) }).toString().replace(/\+/g, '%20')}`
		: '';

	return (
		<ItineraryShell>
			<h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-2">Your trip itinerary</h1>
			<p className="text-gray-700 mb-6">
				Flights and stays appear here after you choose Add to itinerary on a flight or stay details page.
				Adding another flight or stay replaces the one recorded.
			</p>
			<div role="status" aria-live="polite" className={status ? 'mb-6 rounded-lg border border-gray-300 bg-white px-4 py-3' : undefined}>{status}</div>

			<section aria-labelledby="itinerary-flight-heading" className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
				<h2 id="itinerary-flight-heading" ref={flightHeadingRef} tabIndex={-1} className="text-xl font-semibold text-gray-900 mb-3">Flight</h2>
				{flight ? (
					<>
						<dl className="text-gray-800">
							<Row term="Airline">{flight.airline}</Row>
							<Row term="Flight number">{flight.flightNumber}</Row>
							<Row term="From">{flight.departureCity} ({flight.departureAirport})</Row>
							<Row term="To">{flight.arrivalCity} ({flight.arrivalAirport})</Row>
							<Row term="Departure date"><time dateTime={flight.departureDate}>{formatItineraryDate(flight.departureDate)}</time></Row>
							<Row term="Departure time">{flight.departureTime}</Row>
							<Row term="Arrival date"><time dateTime={flight.arrivalDate}>{formatItineraryDate(flight.arrivalDate)}</time></Row>
							<Row term="Arrival time">{flight.arrivalTime}</Row>
							<Row term="Duration">{flight.duration}</Row>
							<Row term="Stops">{flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</Row>
							<Row term="Price">{usd(flight.price)}</Row>
						</dl>
						<button type="button" onClick={() => remove('flight')} className={`${SECONDARY} mt-4`}>Remove flight from itinerary</button>
					</>
				) : (
					<p className="text-gray-700">No flight added yet. <Link to="/flight" className={LINK}>Search flights</Link></p>
				)}
			</section>

			<section aria-labelledby="itinerary-stay-heading" className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
				<h2 id="itinerary-stay-heading" ref={stayHeadingRef} tabIndex={-1} className="text-xl font-semibold text-gray-900 mb-3">Stay</h2>
				{stay ? (
					<>
						<dl className="text-gray-800">
							<Row term="Accommodation">{stay.name}</Row>
							<Row term="Destination">{stay.destination}{stay.area && stay.area !== stay.destination ? ` (${stay.area})` : ''}</Row>
							<Row term="Check-in date"><time dateTime={stay.checkIn}>{formatItineraryDate(stay.checkIn)}</time></Row>
							<Row term="Check-out date"><time dateTime={stay.checkOut}>{formatItineraryDate(stay.checkOut)}</time></Row>
							<Row term="Nights">{stay.nights}</Row>
							<Row term="Guests">{stay.guests}</Row>
							<Row term="Price per night">{usd(stay.nightlyPrice)}</Row>
							<Row term="Total price">{usd(stay.totalPrice)}</Row>
							<Row term="Amenities">{stay.amenities.length ? stay.amenities.join(', ') : 'None listed'}</Row>
						</dl>
						<div className="mt-4 flex flex-wrap gap-3">
							<Link to={stayLink} className={BUTTON}>View stay details</Link>
							<button type="button" onClick={() => remove('stay')} className={SECONDARY}>Remove stay from itinerary</button>
						</div>
					</>
				) : (
					<p className="text-gray-700">No stay added yet. <Link to="/stayscape" className={LINK}>Search stays</Link></p>
				)}
			</section>
		</ItineraryShell>
	);
};

/** /itinerary_study_reset: study-staff page, not linked from the site. */
export const ItineraryResetPage: React.FC = () => <ItineraryReset key={useStorageRefresh(ITINERARY_STORAGE_KEY)} />;

const ItineraryReset: React.FC = () => {
	const [itinerary, setItinerary] = useState<Itinerary>(() => loadItinerary());
	const [status, setStatus] = useState('');
	const [failure, setFailure] = useState('');
	const headingRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => { headingRef.current?.focus(); }, []);

	const handleReset = () => {
		if (resetItinerary()) {
			setItinerary(loadItinerary());
			setFailure('');
			setStatus('The itinerary was reset to its initial, empty state.');
		} else {
			setStatus('');
			setFailure('The itinerary could not be reset because browser storage is unavailable.');
		}
	};

	const describe = (it: Itinerary) => [
		it.flight ? `Flight: ${it.flight.airline} ${it.flight.flightNumber}, ${it.flight.departureAirport} to ${it.flight.arrivalAirport}, departing ${it.flight.departureDate}` : 'Flight: none',
		it.stay ? `Stay: ${it.stay.name}, ${it.stay.checkIn} to ${it.stay.checkOut}` : 'Stay: none',
	];

	return (
		<ItineraryShell>
			<h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-2">Reset trip itinerary</h1>
			<p className="text-gray-700 mb-6">
				This page is for study staff and is not linked from the rest of the site. The button below empties the trip
				itinerary. StayScape saved searches and other browser data are left unchanged.
			</p>
			<section aria-labelledby="itinerary-reset-current" className="mb-6">
				<h2 id="itinerary-reset-current" className="text-xl font-semibold text-gray-900 mb-2">Current itinerary</h2>
				<ul className="list-disc pl-5 text-gray-800">{describe(itinerary).map((line) => <li key={line}>{line}</li>)}</ul>
			</section>
			<button type="button" onClick={handleReset} className={BUTTON}>Reset itinerary to initial state</button>
			<div role="status" aria-live="polite" className="mt-4">{status}</div>
			{failure && <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 text-red-900 px-4 py-3">{failure}</div>}
		</ItineraryShell>
	);
};
