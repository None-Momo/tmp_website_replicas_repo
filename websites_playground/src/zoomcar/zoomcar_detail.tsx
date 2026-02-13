import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLocation } from "react-router-dom";
import { Car } from 'lucide-react';

export const ZoomcarDetail: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [carData, setCarData] = useState<any>(null);

	// get car data from state
	useEffect(() => {
		const state = location?.state;
		// console.log("Location state:", state);
		if (state && state.car_data) {
			setCarData(state.car_data);
		}
	}, [location]);


	return (<div onClick={() => navigate("/done")}>
		{/* <h1>Zoomcar Detail Page</h1> */}
		{carData ? (
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
				{/* <h1>Selected Car</h1> */}
				{/* Render other car details here */}
				<div dangerouslySetInnerHTML={{ __html: carData }} />
			</div>
		) : (
			<p>No car data available.</p>
		)}
	</div>)

};
