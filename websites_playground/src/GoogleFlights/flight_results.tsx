import React from "react";
import { useState, useEffect } from "react";
import { Flight } from './flightAsset';
import { useLocation, useNavigate, useNavigation } from 'react-router-dom';
import { useMemo } from "react";
import { pickBestFileWithDeepseek, naiveMatch } from "../utils/pickbestfileDeepseek";

import { DEEPSEEK_API_KEY } from '../utils/deepseek_key';
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

		// Wrap async code in an immediately invoked async function
		(async () => {
			// RESULTS file — try LLM, fallback to naive
			let bestResults = (await pickBestFileWithDeepseek(JSON.stringify(location.state), flight_files, DEEPSEEK_API_KEY).catch(() => ({ best: null }))).best;
			if (!bestResults) bestResults = naiveMatch(JSON.stringify(location.state), flight_files);

			setRawHtml(bestResults || '')


		})();



	}, [location.state]);


	useEffect(() => {
		if (!rawhtml) return;

		let cancelled = false;

		fetch(`/scraped_data/${rawhtml}`)
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
			<h2 className="text-xl font-semibold mb-4">Flight Results</h2>

			<FilterBar
				value={filters}
				onChange={setFilters}
			// onOpenAll={() => {
			// 	// optional: open a full-screen modal with all filters
			// 	alert("Open full filters modal");
			// }}
			/>

			{filteredResults.length === 0 ? (
				<p></p>
			) : (
				<ul className="space-y-4"
				>
					{filteredResults.map(flight => (
						<li key={flight.id} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between"
							onClick={() => navigate('/flight_details', { state: { flight_data: flight } })}
						>
							<div className="flex items-center space-x-4 mb-2 md:mb-0">
								<div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-bold text-lg">
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

						</li>
					))}
				</ul>
			)}
		</div>
	);
};