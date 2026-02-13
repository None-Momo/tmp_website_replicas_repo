import React, { useState } from 'react';
import { Search, Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router';

const ScapeStay: React.FC = () => {
	const [location, setLocation] = useState('');
	const [checkIn, setCheckIn] = useState('');
	const [checkOut, setCheckOut] = useState('');
	const [guests, setGuests] = useState(1);


	const navigate = useNavigate();

	const handleSearch = () => {
		// alert(`Searching for stays in ${location} from ${checkIn} to ${checkOut} for ${guests} guests`);

		// check if any of the required fields are empty
		if (!location || !checkIn || !checkOut || !guests) {
			alert('Please fill in all the required fields before searching.');
			return;
		}
		//add the location, checkIn, checkOut, and guests as query parameters to the URL
		navigate(`/stayscape_search?location=${encodeURIComponent(location)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${encodeURIComponent(guests)}`);

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
						<a href="#" className="text-gray-700 hover:text-pink-500">Places to stay</a>
						<a href="#" className="text-gray-700 hover:text-pink-500">Experiences</a>
						<a href="#" className="text-gray-700 hover:text-pink-500">Host</a>
					</nav>
					<button className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600">Sign in</button>
				</div>
			</header>

			{/* Hero Section */}
			<section className="flex-grow bg-gradient-to-br from-pink-600 to-fuchsia-300 text-white py-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="text-4xl md:text-6xl font-bold mb-4">Find your next stay</h2>
					<p className="text-xl mb-8">Search deals on hotels, homes, and much more...</p>
					<div className="bg-white rounded-lg shadow-lg p-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
						<div className="flex items-center space-x-2 flex-1">
							<Search className="text-gray-400" />
							<input
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
							<p className="text-gray-400" >CheckIn</p>
							<input
								type="date"
								value={checkIn}
								onChange={(e) => setCheckIn(e.target.value)}
								className="w-full p-2 border-none outline-none text-gray-700"
							/>
						</div>
						<div className="flex items-center space-x-2 flex-1">
							{/* <Calendar className="text-gray-400" /> */}
							<p className="text-gray-400" >CheckOut</p>
							<input
								type="date"
								value={checkOut}
								onChange={(e) => setCheckOut(e.target.value)}
								className="w-full p-2 border-none outline-none text-gray-700"
							/>
						</div>
						<div className="flex items-center space-x-2 flex-1">
							<Users className="text-gray-400" />
							<select
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
							onClick={handleSearch}
							className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 flex items-center space-x-2"
						>
							<Search />
							<span>Search</span>
						</button>
					</div>
				</div>
			</section>


			{/* Footer */}
			<footer className="bg-gray-800 text-white py-8 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto text-center">
					<p>&copy; 2023 ScapeStay. All rights reserved.</p>
					<div className="mt-4 space-x-6">
						<a href="#" className="hover:text-pink-500">Privacy Policy</a>
						<a href="#" className="hover:text-pink-500">Terms of Service</a>
						<a href="#" className="hover:text-pink-500">Contact</a>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default ScapeStay;
