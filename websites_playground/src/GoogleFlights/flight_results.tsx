import React from "react";
import { useState, useEffect } from "react";
import { Flight, flightSlug } from './flightAsset';
import { useLocation, useNavigate, useNavigation } from 'react-router-dom';
import { useMemo } from "react";
import { pickBestLocalFile } from "../utils/pickbestfileDeepseek";
import { parseFlights } from "./htmlSnippetFlight";

import { FilterBar } from "./filterbar";
import { applyFilters } from "./filter_helpers";

export const FlightResults: React.FC = () => {


	const [searchResults, setSearchResults] = useState<Flight[]>([]);
	const [rawhtml, setRawHtml] = useState<string>('');


	const [filters, setFilters] = useState({
		stops: [] as ("nonstop" | "1stop" | "2plus")[],
		airlines: [] as string[],
		bagsIncluded: false,
		priceMax: 800,
		departStart: 0,
		departEnd: 23,
		lowEmissionsOnly: false,
		connectingAirports: [] as string[],
		durationMaxHrs: 24,
	});

	const filteredResults = useMemo(
		() => searchResults.filter(f => applyFilters(f, filters)),
		[searchResults, filters]
	);


	const navigate = useNavigate();
	const location = useLocation();


	useEffect(() => {
		console.log('Location state changed:');
		console.log(location.state);

		const flight_files = [
			"flight_ORDLAX_results.txt",
			"flight_NYCSIN_results.txt"
		];

		const bestResults = pickBestLocalFile(JSON.stringify(location.state || {}), flight_files);
		setRawHtml(bestResults || '');

	}, [location.state]);


	useEffect(() => {
		if (!rawhtml) return;

		let cancelled = false;
		const sourceUrl = new URL(`/scraped_data/${rawhtml}`, window.location.origin).toString();

		fetch(sourceUrl)
			.then(r => {
				if (!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`);
				return r.text();
			})
			.then(t => {
				if (cancelled) return;
				const flights = parseFlights(t);
				setSearchResults(flights);
				console.log(JSON.stringify(flights, null, 2));
			})
			.catch(e => !cancelled && console.log(e.message));


	}, [rawhtml]);

	return (

		<div className="max-w-4xl mx-auto">
			<button
				type="button"
				onClick={() => {
					navigate('/flight');
				}}
				className="mb-4 text-blue-600 hover:underline"
			>
				&larr; New search
			</button>
			<h1 className="text-xl font-semibold mb-4">Flight Results</h1>

			<FilterBar
				value={filters}
				onChange={setFilters}
			// onOpenAll={() => {
			// 	// optional: open a full-screen modal with all filters
			// 	alert("Open full filters modal");
			// }}
			/>

			{/* Announce result-count changes (e.g. after adjusting a filter). */}
			<p className="sr-only" role="status" aria-live="polite">
				{searchResults.length > 0
					? `${filteredResults.length} flight${filteredResults.length === 1 ? '' : 's'} found`
					: ''}
			</p>

			{filteredResults.length === 0 ? (
				<p className="text-gray-600">
					{searchResults.length > 0 ? 'No flights match your filters.' : ''}
				</p>
			) : (
				<ul className="space-y-4"
				>
					{filteredResults.map(flight => (
						// Row stays mouse-clickable for convenience, but the explicit
						// "View details" button below is the accessible CTA (avoids
						// nesting interactive elements).
						<li key={flight.id} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between cursor-pointer"
							onClick={() => navigate(`/flight_details/${flightSlug(flight)}`, { state: { flight_data: flight } })}
						>
							<div className="flex items-center space-x-4 mb-2 md:mb-0">
								{/* text-blue-600 on bg-blue-100 was ~4.2:1, just under the
								    4.5:1 AA minimum at this size; blue-700 clears it. */}
								<div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-700 font-bold text-lg">
									{flight.airlineLogo}
								</div>
								<div>
									<div className="font-semibold text-lg">{flight.airline}</div>
									<div className="text-sm text-gray-600">{flight.class}</div>
								</div>
							</div>
							<div className="flex flex-col md:flex-row md:space-x-6 text-sm text-gray-700">
								<div>
									<div className="font-semibold">{flight.departure} &rarr; {flight.arrival}</div>
									<div>{flight.departureTime} - {flight.arrivalTime}</div>
								</div>
								<div>
									<div>Duration: {flight.duration}</div>
									<div>{flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
								</div>
							</div>
							<div className="mt-2 md:mt-0 text-right text-xl font-semibold text-blue-600">
								${flight.price}
							</div>

							{/* Explicit CTA: a real <button> is an unambiguous, reliably
							    clickable, keyboard-accessible target for opening details
							    (a coordinate click on the <li> alone could miss). */}
							<button
								type="button"
								aria-label={`Open details for ${flight.airline} flight ${flight.departure} to ${flight.arrival} at $${flight.price}`}
								data-testid={`flight-details-${String(flight.airline).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${flight.price}`}
								className="mt-2 md:mt-0 md:ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
								onClick={(e) => {
									e.stopPropagation();
									navigate(`/flight_details/${flightSlug(flight)}`, { state: { flight_data: flight } });
								}}
							>
								View details
							</button>

						</li>
					))}
				</ul>
			)}
		</div>
	);
};
