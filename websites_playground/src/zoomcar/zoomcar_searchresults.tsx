import { useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import HtmlSnippets from '../amazon/htlmSnippersAmazon';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';

interface CarData {
	id: number;
	name: string;
	type: string;
	passengers: number;
	doors: number;
	transmission: string;
	luggage: number;
	features: string[];
	price: number;
	total: number;
	image: string;
}

const ZoomCarSearchResults = () => {


	const customCSS = `
	.choice-icon-badge{ background-color:rgb(16, 14, 14) !important; color:white; font-weight:bold; border-radius:4px; padding:2px 6px; font-size:12px; }
	img.img-responsive{ display:none !important; }
	.avilcardtl>h3{ font-size:1.25rem; font-weight:bold; color:#1a202c; margin-bottom:0.5rem; }
	.payatcntr, .paynow{ font-size:16px; font-weight:700; margin-top:0.2rem; display: flex; flex-direction: column;  align-items: center; justify-content: flex-start; gap: 0.5rem; }
	div.paybtndtl{display: flex; gap: 5.5rem;}
	.pay-later-default{ padding: 0.5rem 1rem; font-weight: 600; font-size: 0.9rem; border: 2px solid rgb(0, 0, 0);  color: #1a202c;  }
	.paynow>a{padding: 0.5rem 1rem; font-weight: 600; font-size: 0.9rem; color:white; background-color: #e53e3e; border: 2px solid rgb(255, 255, 255);}
	.savedata{font-size:9px; font-weight:300; color:rgb(132, 131, 131) ; margin-top:0.2rem;}
	.four-seats-feat::after { content: " Seats Available"; color: gray;font-size: 14px;}
	.four-bags-feat::after { content: " Luggage Available"; color: gray;font-size: 14px;}
	.tableDiv.vehicle-features { display: flex;flex-direction: column;}
	img{display:none !important;}
	`




	// State for search filters
	const [carType, setCarType] = useState<string>('All');
	const [transmission, setTransmission] = useState<string>('All');
	const [passengers, setPassengers] = useState<number>(0);
	const [sortOption, setSortOption] = useState<string>('price-low');

	const [resultsLoaded, setResultsLoaded] = useState(false);
	const [raw, setRaw] = useState<string>();
	const [selectedFilter, setSelectedFilter] = useState<Array<string>>([]);

	const [pickupLocation, setPickupLocation] = useState<string>('');
	const [returnLocation, setReturnLocation] = useState<string>('');
	const [pickupDate, setPickupDate] = useState<Date>(new Date());
	const [returnDate, setReturnDate] = useState<Date>(new Date());


	// get the search parameters from the URL
	const location = useLocation();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	useEffect(() => {
		if (carType !== 'All') {
			setSelectedFilter([carType]);
		}
		if (transmission !== 'All') {
			setSelectedFilter(prev => [...prev, transmission]);
		}


	}, [carType, transmission, passengers]);



	useEffect(() => {

		const pickupLocationParam = searchParams.get('pickupLocation') || '';
		const returnLocationParam = searchParams.get('returnLocation') || searchParams.get('pickupLocation') || '';
		const pickupDateParam = searchParams.get('pickupDate') || '';
		const returnDateParam = searchParams.get('returnDate') || '';

		setPickupLocation(pickupLocationParam);
		setReturnLocation(returnLocationParam);
		setPickupDate(pickupDateParam ? new Date(pickupDateParam) : new Date());
		setReturnDate(returnDateParam ? new Date(returnDateParam) : new Date());

	}, [searchParams]);





	// Car type options
	const carTypes = ['All', 'Compact', 'Midsize', 'SUV', 'Luxury', 'Van'];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white text-white py-4 px-6">
				<div className="container mx-auto flex justify-between items-center">
					<div className="flex items-center space-x-2 ">
						<Car className="h-8 w-8 text-red-600" />
						<span className="font-bold text-2xl text-gray-900">ZoomCar</span>
					</div>
					<nav>
						<ul className="flex space-x-6">
							<li className="hover:underline cursor-pointer">Locations</li>
							<li className="hover:underline cursor-pointer">Deals</li>
							<li className="hover:underline cursor-pointer">My Account</li>
						</ul>
					</nav>
				</div>
			</header>

			{/* Search Modification Section */}
			<div className="bg-white shadow-md py-6 px-4">
				<div className="container mx-auto">
					<h2 className="text-xl font-bold text-gray-800 mb-4">Modify Search</h2>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Location</label>
							<input
								type="text"
								className="w-full p-2 border border-gray-300 rounded"
								// defaultValue="Los Angeles Airport (LAX)"
								value={pickupLocation}
								onChange={(e) => setPickupLocation(e.target.value)}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Date</label>
							<input
								type="date"
								className="w-full p-2 border border-gray-300 rounded"
								value={pickupDate.toISOString().split('T')[0]}
								onChange={(e) => setPickupDate(new Date(e.target.value))}

							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
							<input
								type="date"
								className="w-full p-2 border border-gray-300 rounded"
								value={returnDate.toISOString().split('T')[0]}
								onChange={(e) => setReturnDate(new Date(e.target.value))}
							/>
						</div>
						<div className="flex items-end">
							<button className="w-full bg-red-600 text-white hover:bg-red-700 text-white py-2 px-4 rounded">
								Update Search
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto py-8 px-4">
				<div className="flex flex-col lg:flex-row gap-6">
					{/* Filters Sidebar */}
					<div className="w-full lg:w-1/4 bg-white p-6 rounded-lg shadow-md h-fit">
						<h3 className="text-lg font-bold text-gray-800 mb-4">Filter Results</h3>

						<div className="mb-6">
							<h4 className="font-semibold text-gray-700 mb-2">Car Type</h4>
							<div className="space-y-2">
								{carTypes.map(type => (
									<div key={type} className="flex items-center">
										<input
											type="radio"
											id={`type-${type}`}
											name="carType"
											checked={carType === type}
											onChange={() => setCarType(type)}
											className="mr-2"
										/>
										<label htmlFor={`type-${type}`} className="text-gray-600">{type}</label>
									</div>
								))}
							</div>
						</div>

						<div className="mb-6">
							<h4 className="font-semibold text-gray-700 mb-2">Transmission</h4>
							<div className="space-y-2">
								<div className="flex items-center">
									<input
										type="radio"
										id="trans-all"
										name="transmission"
										checked={transmission === 'All'}
										onChange={() => setTransmission('All')}
										className="mr-2"
									/>
									<label htmlFor="trans-all" className="text-gray-600">All</label>
								</div>
								<div className="flex items-center">
									<input
										type="radio"
										id="trans-auto"
										name="transmission"
										checked={transmission === 'Automatic'}
										onChange={() => setTransmission('Automatic')}
										className="mr-2"
									/>
									<label htmlFor="trans-auto" className="text-gray-600">Automatic</label>
								</div>
								<div className="flex items-center">
									<input
										type="radio"
										id="trans-manual"
										name="transmission"
										checked={transmission === 'Manual'}
										onChange={() => setTransmission('Manual')}
										className="mr-2"
									/>
									<label htmlFor="trans-manual" className="text-gray-600">Manual</label>
								</div>
							</div>
						</div>

						{/* <div className="mb-6">
							<h4 className="font-semibold text-gray-700 mb-2">Passengers</h4>
							<div className="flex items-center space-x-4">
								{[0, 2, 4, 5, 7].map(num => (
									<button
										key={num}
										onClick={() => setPassengers(num)}
										className={`px-3 py-1 rounded ${passengers === num ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-200 text-gray-700'}`}
									>
										{num === 0 ? 'Any' : num + '+'}
									</button>
								))}
							</div>
						</div> */}

						<button
							onClick={() => {
								setCarType('All');
								setTransmission('All');
								setPassengers(0);
								setSelectedFilter([]);
							}}
							className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
						>
							Clear Filters
						</button>
					</div>

					{/* Results Section */}
					<div className="w-full lg:w-3/4">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-4 rounded-lg shadow-md">
							{/* TODO replace this from results */}
							<div>

								<h2 className="text-xl font-bold text-gray-800">{pickupLocation}</h2>
								<p className="text-gray-600">{pickupDate.toString().split(' GMT')[0]} - {returnDate.toString().split(' GMT')[0]} ({Math.floor((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24))} days)</p>
							</div>
							{/* <div className="mt-2 sm:mt-0">
								<label className="mr-2 text-gray-700">Sort by:</label>
								<select
									value={sortOption}
									onChange={(e) => setSortOption(e.target.value)}
									className="border border-gray-300 rounded p-2"
								>
									<option value="price-low">Price (Low to High)</option>
									<option value="price-high">Price (High to Low)</option>
									<option value="passengers">Passenger Capacity</option>
								</select>
							</div> */}
						</div>

						{/* <div className="space-y-6">
							{sortedCars.length > 0 ? (
								sortedCars.map(car => (
									<div key={car.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col md:flex-row">
										<div className="md:w-1/3 p-4 flex items-center justify-center">
											<div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-48 flex items-center justify-center">
												<span className="text-gray-500">{car.name} Image</span>
											</div>
										</div>
										<div className="md:w-2/3 p-6">
											<div className="flex flex-col md:flex-row justify-between">
												<div>
													<h3 className="text-xl font-bold text-gray-800">{car.name}</h3>
													<p className="text-gray-600 mb-2">{car.type} Car</p>
													<div className="flex flex-wrap gap-2 mb-4">
														<span className="bg-gray-100 px-2 py-1 rounded text-sm">{car.passengers} Passengers</span>
														<span className="bg-gray-100 px-2 py-1 rounded text-sm">{car.doors} Doors</span>
														<span className="bg-gray-100 px-2 py-1 rounded text-sm">{car.transmission}</span>
														<span className="bg-gray-100 px-2 py-1 rounded text-sm">{car.luggage} Luggage</span>
													</div>
													<div className="flex flex-wrap gap-2">
														{car.features.map((feature, index) => (
															<span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
																{feature}
															</span>
														))}
													</div>
												</div>
												<div className="mt-4 md:mt-0 md:text-right">
													<div className="text-2xl font-bold text-gray-800">${car.price.toFixed(2)}<span className="text-base font-normal text-gray-600">/day</span></div>
													<div className="text-lg text-gray-600 line-through">${(car.price + 5).toFixed(2)}</div>
													<div className="text-lg font-semibold text-gray-800 mt-2">Total: ${car.total.toFixed(2)}</div>
													<button className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded font-medium">
														Select
													</button>
												</div>
											</div>
										</div>
									</div>
								))
							) : (
								<div className="bg-white rounded-lg shadow-md p-8 text-center">
									<h3 className="text-xl font-bold text-gray-800 mb-2">No cars match your filters</h3>
									<p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
									<button
										onClick={() => {
											setCarType('All');
											setTransmission('All');
											setPassengers(0);
										}}
										className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
									>
										Clear Filters
									</button>
								</div>
							)}
						</div> */}

						<div className="space-y-6">
							{/* use htmlsnipper to render the file */}
							{/* TODO replace with raw */}
							<HtmlSnippets source={`/scraped_data/avis_car_elements.txt`}
								query={`${pickupLocation}To${returnLocation}`} setResultsLoaded={setResultsLoaded}
								navigateToDetails={(car_data) => {
									console.log("Navigating to details with car data:", car_data);
									//navigate to done page with the selected car details
									// navigate("/done")
									navigate("/zoomcar_details", { state: { car_data } })

								}}
								customCSSProp={customCSS}
								selectedFilters={selectedFilter}
								orientation='grid' />


						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="bg-gray-800 text-white py-8 px-4 mt-12">
				<div className="container mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						<div>
							<h4 className="text-lg font-bold mb-4">ZoomCar</h4>
							<ul className="space-y-2 text-gray-300">
								<li className="hover:text-white cursor-pointer">About Us</li>
								<li className="hover:text-white cursor-pointer">Locations</li>
								<li className="hover:text-white cursor-pointer">Careers</li>
								<li className="hover:text-white cursor-pointer">Contact</li>
							</ul>
						</div>
						<div>
							<h4 className="text-lg font-bold mb-4">Policies</h4>
							<ul className="space-y-2 text-gray-300">
								<li className="hover:text-white cursor-pointer">Privacy Policy</li>
								<li className="hover:text-white cursor-pointer">Terms of Use</li>
								<li className="hover:text-white cursor-pointer">Cancellation Policy</li>
							</ul>
						</div>
						<div>
							<h4 className="text-lg font-bold mb-4">Support</h4>
							<ul className="space-y-2 text-gray-300">
								<li className="hover:text-white cursor-pointer">FAQ</li>
								<li className="hover:text-white cursor-pointer">Help Center</li>
								<li className="hover:text-white cursor-pointer">Roadside Assistance</li>
							</ul>
						</div>
						<div>
							<h4 className="text-lg font-bold mb-4">Contact</h4>
							<ul className="space-y-2 text-gray-300">
								<li>1-800-ZOOMCAR</li>
								<li>support@zoomcar.com</li>
								<li>Mon-Fri 8am-8pm EST</li>
							</ul>
						</div>
					</div>
					<div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
						<p>© 2023 ZoomCar. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default ZoomCarSearchResults;
