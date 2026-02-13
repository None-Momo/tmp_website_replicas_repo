import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Shield, DollarSign, ChevronRight, Menu, X, Car, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router';

interface Vehicle {
	id: number;
	name: string;
	category: string;
	price: number;
	seats: number;
	transmission: string;
	features: string[];
}

const vehicles: Vehicle[] = [
	{ id: 1, name: 'Toyota Camry', category: 'Standard', price: 45, seats: 5, transmission: 'Automatic', features: ['GPS', 'Bluetooth', 'Backup Camera'] },
	{ id: 2, name: 'Honda CR-V', category: 'SUV', price: 65, seats: 7, transmission: 'Automatic', features: ['GPS', 'AWD', 'Apple CarPlay'] },
	{ id: 3, name: 'BMW 3 Series', category: 'Luxury', price: 95, seats: 5, transmission: 'Automatic', features: ['Leather Seats', 'Premium Sound', 'Sunroof'] },
	{ id: 4, name: 'Nissan Versa', category: 'Economy', price: 35, seats: 5, transmission: 'Automatic', features: ['Bluetooth', 'USB Port', 'AC'] },
	{ id: 5, name: 'Chevrolet Tahoe', category: 'Premium SUV', price: 120, seats: 8, transmission: 'Automatic', features: ['4WD', 'Entertainment System', 'Premium Interior'] },
	{ id: 6, name: 'Tesla Model 3', category: 'Electric', price: 110, seats: 5, transmission: 'Automatic', features: ['Autopilot', 'Supercharging', 'Premium Audio'] },
];

export default function ZoomCarRental() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState('All');
	const [pickupLocation, setPickupLocation] = useState('');
	const [returnLocation, setReturnLocation] = useState('');
	const [pickupDate, setPickupDate] = useState('');
	const [returnDate, setReturnDate] = useState('');

	const navigate = useNavigate();

	const categories = ['All', 'Economy', 'Standard', 'SUV', 'Luxury', 'Premium SUV', 'Electric'];

	const filteredVehicles = selectedCategory === 'All'
		? vehicles
		: vehicles.filter(v => v.category === selectedCategory);


	const handleSearch = () => {
		// get the search parameters and navigate to the search results page
		const searchParams = new URLSearchParams();
		if (pickupLocation) searchParams.append('pickupLocation', pickupLocation);
		if (returnLocation) searchParams.append('returnLocation', returnLocation);
		if (pickupDate) searchParams.append('pickupDate', pickupDate);
		if (returnDate) searchParams.append('returnDate', returnDate);

		navigate(`/zoomcar_search?${searchParams.toString()}`);
	}

	return (
		<div className="min-h-screen bg-white">
			{/* Header */}
			<header className="bg-white shadow-sm sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<div className="flex items-center space-x-2">
								<Car className="h-8 w-8 text-red-600" />
								<span className="font-bold text-2xl text-gray-900">ZoomCar</span>
							</div>
						</div>

						<nav className="hidden md:flex space-x-8">
							<a href="#" className="text-gray-700 hover:text-red-600 transition-colors">Vehicles</a>
							<a href="#" className="text-gray-700 hover:text-red-600 transition-colors">Locations</a>
							<a href="#" className="text-gray-700 hover:text-red-600 transition-colors">Deals</a>
							<a href="#" className="text-gray-700 hover:text-red-600 transition-colors">Business</a>
							<a href="#" className="text-gray-700 hover:text-red-600 transition-colors">Support</a>
						</nav>

						<div className="hidden md:flex items-center space-x-4">
							<button className="text-gray-700 hover:text-red-600 transition-colors">Sign In</button>
							<button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
								Join Now
							</button>
						</div>

						<button
							className="md:hidden"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
						</button>
					</div>
				</div>

				{/* Mobile Menu */}
				{mobileMenuOpen && (
					<div className="md:hidden bg-white border-t">
						<div className="px-2 pt-2 pb-3 space-y-1">
							<a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Vehicles</a>
							<a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Locations</a>
							<a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Deals</a>
							<a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Business</a>
							<a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Support</a>
							<div className="border-t mt-2 pt-2">
								<a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Sign In</a>
								<a href="#" className="block px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 mx-3 text-center">Join Now</a>
							</div>
						</div>
					</div>
				)}
			</header>

			{/* Hero Section */}
			<section className="bg-gradient-to-br from-red-50 to-red-100 py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-8">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">Drive Your Journey Forward</h1>
						<p className="text-xl text-gray-600">Premium car rentals at unbeatable prices</p>
					</div>

					{/* Booking Form */}
					<div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
						<div className="grid md:grid-cols-2 gap-4 mb-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									<MapPin className="inline h-4 w-4 mr-1" />
									Pick-up Location
								</label>
								<input
									type="text"
									value={pickupLocation}
									onChange={(e) => setPickupLocation(e.target.value)}
									placeholder="Enter city, airport, or address"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									<MapPin className="inline h-4 w-4 mr-1" />
									Return Location
								</label>
								<input
									type="text"
									value={returnLocation}
									onChange={(e) => setReturnLocation(e.target.value)}
									placeholder="Same as pick-up"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
								/>
							</div>
						</div>

						<div className="grid md:grid-cols-2 gap-4 mb-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									<Calendar className="inline h-4 w-4 mr-1" />
									Pick-up Date & Time
								</label>
								<input
									type="datetime-local"
									value={pickupDate}
									onChange={(e) => setPickupDate(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									<Calendar className="inline h-4 w-4 mr-1" />
									Return Date & Time
								</label>
								<input
									type="datetime-local"
									value={returnDate}
									onChange={(e) => setReturnDate(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
								/>
							</div>
						</div>

						<button className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center"
							onClick={handleSearch}
						>
							Search Available Cars
							<ChevronRight className="ml-2 h-5 w-5" />
						</button>
					</div>
				</div>
			</section>

			{/* Vehicle Categories */}
			<section className="py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Fleet</h2>

					{/* Category Filter */}
					<div className="flex flex-wrap justify-center gap-2 mb-8">
						{categories.map((category) => (
							<button
								key={category}
								onClick={() => setSelectedCategory(category)}
								className={`px-4 py-2 rounded-lg transition-colors ${selectedCategory === category
									? 'bg-red-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
									}`}
							>
								{category}
							</button>
						))}
					</div>

					{/* Vehicle Grid */}
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredVehicles.map((vehicle) => (
							<div key={vehicle.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
								<div className="bg-gray-200 border-2 border-dashed rounded-t-lg h-48" />
								<div className="p-6">
									<div className="flex justify-between items-start mb-2">
										<div>
											<h3 className="text-xl font-semibold text-gray-900">{vehicle.name}</h3>
											<p className="text-sm text-gray-500">{vehicle.category}</p>
										</div>
										<div className="text-right">
											<p className="text-2xl font-bold text-red-600">${vehicle.price}</p>
											<p className="text-sm text-gray-500">per day</p>
										</div>
									</div>

									<div className="flex items-center gap-4 my-4 text-sm text-gray-600">
										<span className="flex items-center">
											<Users className="h-4 w-4 mr-1" />
											{vehicle.seats} seats
										</span>
										<span>{vehicle.transmission}</span>
									</div>

									<div className="flex flex-wrap gap-2 mb-4">
										{vehicle.features.map((feature, idx) => (
											<span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
												{feature}
											</span>
										))}
									</div>

									<button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
										onClick={() => navigate(`/done`)}>
										Select Vehicle
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Special Offers */}
			<section className="py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Special Offers</h2>
					<div className="grid md:grid-cols-2 gap-6">
						<div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
							<h3 className="text-2xl font-bold mb-2">Weekend Special</h3>
							<p className="mb-4">Get 25% off on weekend rentals. Book Friday through Monday and save!</p>
							<button className="bg-white text-red-600 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
								Learn More
							</button>
						</div>

						<div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg p-6 text-white">
							<h3 className="text-2xl font-bold mb-2">Monthly Rentals</h3>
							<p className="mb-4">Save up to 40% on monthly rentals. Perfect for extended stays!</p>
							<button className="bg-white text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
								Learn More
							</button>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid md:grid-cols-4 gap-8">
						<div>
							<div className="flex items-center space-x-2 mb-4">
								<Car className="h-8 w-8 text-red-500" />
								<span className="font-bold text-2xl">ZoomCar</span>
							</div>
							<p className="text-gray-400">Your trusted partner for car rentals worldwide.</p>
						</div>

						<div>
							<h4 className="font-semibold text-lg mb-4">Company</h4>
							<ul className="space-y-2 text-gray-400">
								<li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Press</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Investor Relations</a></li>
							</ul>
						</div>

						<div>
							<h4 className="font-semibold text-lg mb-4">Support</h4>
							<ul className="space-y-2 text-gray-400">
								<li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
								<li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
							</ul>
						</div>

						<div>
							<h4 className="font-semibold text-lg mb-4">Connect</h4>
							<div className="space-y-2 text-gray-400">
								<p className="flex items-center">
									<Phone className="h-4 w-4 mr-2" />
									1-800-ZOOMCAR
								</p>
								<p className="flex items-center">
									<Mail className="h-4 w-4 mr-2" />
									support@zoomcar.com
								</p>
							</div>
							<div className="flex space-x-4 mt-4">
								<a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
								<a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
								<a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a>
							</div>
						</div>
					</div>

					<div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
						<p>&copy; 2024 ZoomCar. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
