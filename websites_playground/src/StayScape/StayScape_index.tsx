import React, { useEffect, useRef, useState } from 'react';
import { Search, Calendar, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { checkStayDates, staySearchQuery } from './StayScape_search';
import { applyStudyInit } from './StayScape_study_init';

const ScapeStay: React.FC = () => {
	// A study start URL (?study_init=...&study_run_id=...) restores that task's
	// initial data the first time its run id is seen. It runs synchronously
	// during the first render for each distinct query string, so the reset is
	// written before anything is shown; repeats of the same run id are no-ops.
	const { search: query } = useLocation();
	const initializedFor = useRef<string | null>(null);
	if (initializedFor.current !== query) {
		initializedFor.current = query;
		applyStudyInit(query);
	}

	const [location, setLocation] = useState('');
	const [checkIn, setCheckIn] = useState('');
	const [checkOut, setCheckOut] = useState('');
	const [guests, setGuests] = useState(1);


	const navigate = useNavigate();

	const [errors, setErrors] = useState<string[]>([]);
	const [submitCount, setSubmitCount] = useState(0);
	const errorRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (submitCount > 0 && errors.length > 0) errorRef.current?.focus();
	}, [submitCount, errors]);

	// A native form, so Enter in any field searches too. Problems are listed
	// in an alert on the page (a browser alert() dialog blocked the page and
	// any automation driving it).
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const problems: string[] = [];
		if (!location.trim()) problems.push('Enter a destination.');
		const dates = checkStayDates(checkIn, checkOut);
		if (dates.status === 'none') problems.push('Enter a check-in date.', 'Enter a check-out date.');
		if (dates.status === 'invalid') {
			if (dates.checkInError) problems.push(dates.checkInError);
			if (dates.checkOutError) problems.push(dates.checkOutError);
		}
		setErrors(problems);
		setSubmitCount((c) => c + 1);
		if (problems.length > 0) return;
		navigate(`/stayscape_search?${staySearchQuery({ location: location.trim(), checkIn, checkOut, guests, maxPrice: '', amenities: [] })}`);
	};

	const featupinkStays = [
		{ id: 1, title: 'Cozy Cabin', price: '$120/night' },
		{ id: 2, title: 'Urban Loft', price: '$150/night' },
		{ id: 3, title: 'Beach House', price: '$200/night' },
		{ id: 4, title: 'Mountain Retreat', price: '$180/night' },
	];

	return (
		<div className="flex flex-col min-h-screen bg-white">
			{/* Header */}
			<header className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
					<h1 className="text-2xl font-bold text-pink-500">ScapeStay</h1>
					<nav className="hidden md:flex space-x-6">
							<a href="#search-stays" className="text-gray-700 hover:text-pink-500">Places to stay</a>
							<a href="#search-stays" className="text-gray-700 hover:text-pink-500">Experiences</a>
							<a href="#search-stays" className="text-gray-700 hover:text-pink-500">Host</a>
					</nav>
					<div className="flex items-center space-x-6">
						{/* Kept outside the md:flex nav so it stays reachable in narrow
						    windows, e.g. with a browser side panel open. */}
						<Link to="/stayscape_saved" className="text-gray-700 hover:text-pink-500">Saved searches</Link>
						<Link to="/itinerary" className="text-gray-700 hover:text-pink-500">Itinerary</Link>
						{/* bg-pink-500 + white text is ~3.5:1, below the 4.5:1 AA
						    minimum; pink-600 clears it (~4.6:1). */}
						<button type="button" className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700">Sign in</button>
					</div>
				</div>
			</header>

			{/* Hero Section */}
				<div id="search-stays" className="flex-grow bg-gradient-to-br from-pink-600 to-fuchsia-300 text-white py-20 px-4 sm:px-6 lg:px-8">
					<div className="max-w-4xl mx-auto text-center">
						<h2 className="text-4xl md:text-6xl font-bold mb-4">Find your next stay</h2>
						<p className="text-xl mb-8">Search deals on hotels, homes, and much more...</p>
						{errors.length > 0 && (
							<div ref={errorRef} tabIndex={-1} role="alert" className="bg-white text-red-800 border-2 border-red-600 rounded-lg p-4 mb-4 text-left">
								<p className="font-semibold">Please fix the following before searching:</p>
								<ul className="list-disc pl-5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
							</div>
						)}
						<form onSubmit={handleSearch} noValidate aria-label="Search stays" className="bg-white rounded-lg shadow-lg p-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
							<div className="flex items-center space-x-2 flex-1">
								<Search className="text-gray-400" aria-hidden="true" />
								<input
									aria-label="Destination"
									type="text"
								placeholder="Where are you going?"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								className="w-full p-2 border-none outline-none text-gray-700"
							/>
						</div>
							<div className="flex items-center space-x-2 flex-1">
							{/* <Calendar className="text-gray-400" /> */}
							{/* add a gray text  */}
								<label htmlFor="stayscape-checkin" className="text-gray-500">Check in</label>
								<input
									id="stayscape-checkin"
									type="date"
								value={checkIn}
								onChange={(e) => setCheckIn(e.target.value)}
								className="w-full p-2 border-none outline-none text-gray-700"
							/>
						</div>
							<div className="flex items-center space-x-2 flex-1">
							{/* <Calendar className="text-gray-400" /> */}
								<label htmlFor="stayscape-checkout" className="text-gray-500">Check out</label>
								<input
									id="stayscape-checkout"
									type="date"
								value={checkOut}
								onChange={(e) => setCheckOut(e.target.value)}
								className="w-full p-2 border-none outline-none text-gray-700"
							/>
						</div>
							<div className="flex items-center space-x-2 flex-1">
								<Users className="text-gray-400" aria-hidden="true" />
								<select
									aria-label="Guests"
									value={guests}
								onChange={(e) => setGuests(Number(e.target.value))}
								className="w-full p-2 border-none outline-none text-gray-700"
							>
								<option value={1}>1 guest</option>
								<option value={2}>2 guests</option>
								<option value={3}>3 guests</option>
								<option value={4}>4 guests</option>
							</select>
						</div>
							<button
								type="submit"
							className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 flex items-center space-x-2"
						>
								<Search aria-hidden="true" />
							<span>Search</span>
						</button>
					</form>
				</div>
				</div>


			{/* Footer */}
			<footer className="bg-gray-800 text-white py-8 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto text-center">
					<p>&copy; 2023 ScapeStay. All rights reserved.</p>
					<div className="mt-4 space-x-6">
							<a href="#search-stays" className="hover:text-pink-500">Privacy Policy</a>
							<a href="#search-stays" className="hover:text-pink-500">Terms of Service</a>
							<a href="#search-stays" className="hover:text-pink-500">Contact</a>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default ScapeStay;
