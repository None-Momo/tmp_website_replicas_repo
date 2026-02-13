import React, { useState } from 'react';
import { Search, Home, MapPin, DollarSign, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Property = {
	id: number;
	title: string;
	location: string;
	price: string;
	image: string;
};

const mockProperties: Property[] = [
	{ id: 1, title: 'Modern Apartment', location: 'New York, NY', price: '$500,000', image: 'placeholder' },
	{ id: 2, title: 'Cozy House', location: 'Los Angeles, CA', price: '$750,000', image: 'placeholder' },
	{ id: 3, title: 'Luxury Villa', location: 'Miami, FL', price: '$1,200,000', image: 'placeholder' },
];

const Dwellio: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState('');
	const [filteredProperties, setFilteredProperties] = useState(mockProperties);

	const navigate = useNavigate();
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		// check if searchQuery is empty
		if (searchQuery.trim() === '') {
			// if empty, navigate to /dwellio without query params
			navigate('/dwellio');
		} else {
			console.log("Search query is ", searchQuery);
			// if not empty, navigate to /dwellio_search with query params
			navigate(`/dwellio_search?location=${encodeURIComponent(searchQuery)}`);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 font-sans">
			{/* Header */}
			<header className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
				<div className="flex items-center space-x-2">
					<Home className="text-blue-600 w-8 h-8" />
					<h1 className="text-2xl font-bold text-blue-600">Dwellio</h1>
				</div>
				<div className="flex items-center space-x-4">
					<User className="text-gray-700 w-6 h-6" />
					<button className="bg-blue-600 text-white px-4 py-2 rounded">Sign In</button>
				</div>
			</header>

			{/* Hero Section */}
			<section className="bg-blue-600 text-white py-16 px-6 text-center">
				<h2 className="text-4xl font-bold mb-4">Find Your Dream Home</h2>
				<p className="text-xl mb-8">Search millions of homes for sale and rent</p>
				<form onSubmit={handleSearch} className="max-w-md mx-auto flex space-x-2">
					<input
						type="text"
						placeholder="Enter city, state, or ZIP"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 px-4 py-2 rounded border-0 text-gray-900"
					/>
					<button type="submit" className="bg-white text-blue-600 px-4 py-2 rounded flex items-center space-x-1">
						<Search className="w-5 h-5" />
						<span>Search</span>
					</button>
				</form>
			</section>


		</div>
	);
};

export default Dwellio;