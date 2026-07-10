import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Flight, flightSlug } from "./flightAsset";
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
			const match = parseFlights(text).find(f => flightSlug(f) === slug);
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
		{lookupStatus === 'ready' && flightData ? (
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<header className="bg-white text-white py-4 px-6">
					<div className="container mx-auto flex justify-between items-center">
						<div className="flex items-center space-x-2 ">
							<h1 className="font-bold text-2xl text-gray-900">Google Flights</h1>
						</div>
					</div>
				</header>
				{/* Render flight details here */}
				<div >
					<div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg mt-6">
						<div className="flex items-center space-x-4 mb-2 md:mb-0">
							<div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-700 font-bold text-lg">
								{flightData.airlineLogo}
							</div>
							<div>
								<h2 className="font-semibold text-lg">{flightData.airline}</h2>
								<div className="text-sm text-gray-600">{flightData.class}</div>
							</div>
						</div>
						<div className="flex flex-col md:flex-row md:space-x-6 text-sm text-gray-700">
							<div>
								<div className="font-semibold">{flightData.departure} &rarr; {flightData.arrival}</div>
								<div>{flightData.departureTime} - {flightData.arrivalTime}</div>
							</div>
							<div>
								<div>Duration: {flightData.duration}</div>
								<div>{flightData.stops === 0 ? 'Nonstop' : `${flightData.stops} stop${flightData.stops > 1 ? 's' : ''}`}</div>
							</div>
						</div>
						<div className="mt-2 md:mt-0 text-right text-xl font-semibold text-blue-600">
							${flightData.price}
						</div>
						<button
							type="button"
							aria-label={`Buy ${flightData.airline} flight from ${flightData.departure} to ${flightData.arrival} for $${flightData.price}`}
							className="mt-2 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
						>
							Buy
						</button>
					</div>
				</div>
			</div>
		) : null}
	</div>)
};