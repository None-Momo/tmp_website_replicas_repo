import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Flight, flightDates, flightSlug, formatFlightDate, legacyFlightSlug } from "./flightAsset";
import { setItineraryFlight } from "../itinerary/itinerary_data";
import { parseFlights } from "./htmlSnippetFlight";

// The only two flight datasets that exist; both are small enough to search
// in full when a flight must be recovered from the URL alone.
const CANDIDATE_FILES = ["flight_ORDLAX_results.txt", "flight_NYCSIN_results.txt"];

async function findFlightBySlug(slug: string): Promise<Flight | null> {
	for (const file of CANDIDATE_FILES) {
		try {
			const sourceUrl = new URL(`/scraped_data/${file}`, window.location.origin).toString();
			const res = await fetch(sourceUrl);
			if (!res.ok) continue;
			const text = await res.text();
			const flights = parseFlights(text);
			// Current slugs first; then the older slug format, so old links still work.
			const match = flights.find(f => flightSlug(f) === slug) ?? flights.find(f => legacyFlightSlug(f) === slug);
			if (match) return match;
		} catch {
			// try the next candidate file
		}
	}
	return null;
}

export const FlightDetails: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { slug } = useParams<{ slug?: string }>();
	const [searchParams] = useSearchParams();
	// The departure date travels in the URL (?date=) so it survives a refresh.
	const departureDate = searchParams.get('date') || (location?.state?.departureDate as string | undefined) || '';
	const [status, setStatus] = useState('');
	const [addError, setAddError] = useState('');

	// location.state is the fast path when the user clicked here from the
	// results list. It's absent on a direct link, a refresh, or a crawler
	// (e.g. Lighthouse) opening this URL cold — previously leaving the page
	// permanently blank ("No flight data available."). Fall back to
	// re-deriving the flight from the :slug URL param in that case.
	const stateFlight: Flight | undefined = location?.state?.flight_data;
	const [flightData, setFlightData] = useState<Flight | undefined>(stateFlight);
	const [lookupStatus, setLookupStatus] = useState<'ready' | 'loading' | 'not-found'>(
		stateFlight ? 'ready' : (slug ? 'loading' : 'not-found')
	);

	const headingRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		if (lookupStatus === 'ready') headingRef.current?.focus();
	}, [lookupStatus]);

	useEffect(() => {
		if (stateFlight) {
			setFlightData(stateFlight);
			setLookupStatus('ready');
			return;
		}
		if (!slug) {
			setLookupStatus('not-found');
			return;
		}
		let cancelled = false;
		setLookupStatus('loading');
		findFlightBySlug(slug).then((flight) => {
			if (cancelled) return;
			if (flight) {
				setFlightData(flight);
				setLookupStatus('ready');
			} else {
				setLookupStatus('not-found');
			}
		});
		return () => { cancelled = true; };
	}, [slug, stateFlight]);

	// Removed the whole-page onClick that sent ANY click to /done, so reaching
	// the correct flight details no longer abandons the page on the next click.
	// The explicit "Buy" button carries the intentional booking action.
	return (<div>
		{lookupStatus === 'loading' && (
			<p className="text-center text-gray-600 py-12" role="status">Loading flight…</p>
		)}
		{lookupStatus === 'not-found' && (
			<div className="text-center py-12" role="alert">
				<h1 className="text-xl font-semibold text-gray-900 mb-2">Flight not found</h1>
				<p className="text-gray-600 mb-4">We couldn't find a flight matching this link.</p>
				<button type="button" className="text-blue-600 hover:underline" onClick={() => navigate('/flight')}>
					Back to search
				</button>
			</div>
		)}
		{lookupStatus === 'ready' && flightData ? (() => {
			const dates = flightDates(flightData, departureDate);
			const stopsText = flightData.stops === 0 ? 'Nonstop' : `${flightData.stops} stop${flightData.stops > 1 ? 's' : ''}`;
			const handleAdd = () => {
				if (!dates) {
					setStatus('');
					setAddError('This flight has no departure date. Search for flights with a departure date, then open the flight again.');
					return;
				}
				const outcome = setItineraryFlight({
					airline: flightData.airline,
					flightNumber: flightData.flightNumber,
					departureAirport: flightData.departure,
					departureCity: flightData.departureCity,
					arrivalAirport: flightData.arrival,
					arrivalCity: flightData.arrivalCity,
					departureDate: dates.departureDate,
					departureTime: flightData.departureTime,
					arrivalDate: dates.arrivalDate,
					arrivalTime: flightData.arrivalTime,
					duration: flightData.duration,
					stops: flightData.stops,
					price: flightData.price,
				});
				if (!outcome.ok) {
					setStatus('');
					setAddError('The flight could not be added because browser storage is unavailable.');
					return;
				}
				setAddError('');
				setStatus(`${outcome.replaced ? "Your itinerary's flight was replaced with" : 'Added'} ${flightData.airline} flight ${flightData.flightNumber}, arriving ${formatFlightDate(dates.arrivalDate)} at ${flightData.arrivalTime}${outcome.replaced ? '.' : ', to your itinerary.'}`);
			};
			return (
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<header className="bg-white text-white py-4 px-6">
					<div className="container mx-auto flex justify-between items-center">
						<div className="flex items-center space-x-2 ">
							<h1 className="font-bold text-2xl text-gray-900">Google Flights</h1>
						</div>
						<Link to="/itinerary" className="text-blue-700 underline hover:text-blue-800">Itinerary</Link>
					</div>
				</header>
				{/* Render flight details here */}
				<div >
					<div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg mt-6">
						<div className="flex items-center space-x-4 mb-4">
							<div aria-hidden="true" className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-700 font-bold text-lg">
								{flightData.airlineLogo}
							</div>
							<div>
								<h2 ref={headingRef} tabIndex={-1} className="font-semibold text-lg text-gray-900">{flightData.airline} flight {flightData.flightNumber}</h2>
								<div className="text-sm text-gray-600">{flightData.class}</div>
							</div>
						</div>
						<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-800">
							<div><dt className="inline font-semibold">Airline: </dt><dd className="inline">{flightData.airline}</dd></div>
							<div><dt className="inline font-semibold">Flight number: </dt><dd className="inline">{flightData.flightNumber}</dd></div>
							<div><dt className="inline font-semibold">From: </dt><dd className="inline">{flightData.departureCity} ({flightData.departure})</dd></div>
							<div><dt className="inline font-semibold">To: </dt><dd className="inline">{flightData.arrivalCity} ({flightData.arrival})</dd></div>
							<div><dt className="inline font-semibold">Departure date: </dt><dd className="inline">{dates ? <time dateTime={dates.departureDate}>{formatFlightDate(dates.departureDate)}</time> : 'Not selected'}</dd></div>
							<div><dt className="inline font-semibold">Departure time: </dt><dd className="inline">{flightData.departureTime}</dd></div>
							<div><dt className="inline font-semibold">Arrival date: </dt><dd className="inline">{dates ? <time dateTime={dates.arrivalDate}>{formatFlightDate(dates.arrivalDate)}</time> : 'Not selected'}{flightData.arrivalDayOffset > 0 ? ` (+${flightData.arrivalDayOffset} day${flightData.arrivalDayOffset > 1 ? 's' : ''})` : ''}</dd></div>
							<div><dt className="inline font-semibold">Arrival time: </dt><dd className="inline">{flightData.arrivalTime}</dd></div>
							<div><dt className="inline font-semibold">Duration: </dt><dd className="inline">{flightData.duration}</dd></div>
							<div><dt className="inline font-semibold">Stops: </dt><dd className="inline">{stopsText}</dd></div>
						</dl>
						<p className="mt-2 text-sm text-gray-600">Times are local to each airport.</p>
						<div className="mt-2 md:mt-0 text-right text-xl font-semibold text-blue-600">
							${flightData.price}
						</div>
						<div className="flex flex-wrap gap-3 justify-end mt-2">
							<button
								type="button"
								aria-label={`Buy ${flightData.airline} flight from ${flightData.departure} to ${flightData.arrival} for $${flightData.price}`}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
							>
								Buy
							</button>
							<button
								type="button"
								onClick={handleAdd}
								className="bg-white text-blue-700 border border-blue-700 px-4 py-2 rounded hover:bg-blue-50"
							>
								Add to itinerary
							</button>
						</div>
						{addError && <div role="alert" className="mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-900">{addError}</div>}
						<div role="status" aria-live="polite" className={status ? 'mt-4 rounded border border-green-300 bg-green-50 px-4 py-3 text-green-900' : 'mt-4'}>{status}</div>
						{status && <p className="mt-2"><Link to="/itinerary" className="text-blue-700 underline hover:text-blue-800">View itinerary</Link></p>}
					</div>
				</div>
			</div>
			);
		})()
		: null}
	</div>)
};