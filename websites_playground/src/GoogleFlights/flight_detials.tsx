import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const FlightDetails: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const flightData = location?.state?.flight_data;

	// Removed the whole-page onClick that sent ANY click to /done, so reaching
	// the correct flight details no longer abandons the page on the next click.
	// The explicit "Buy" button carries the intentional booking action.
	return (<div>
		{flightData ? (
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
							<div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-bold text-lg">
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
		) : (
			<p>No flight data available.</p>
		)}
	</div>)
};