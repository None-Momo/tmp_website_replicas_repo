import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home } from 'lucide-react';

export const DwellioDetails: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const product = location?.state?.product;

	// Removed whole-page onClick -> /done (a click-trap that abandoned the
	// details page on any click); the explicit button below still navigates.
	return (<div>
		{product ? (
			<div className="min-h-screen bg-gray-50">
				<header className="bg-white shadow-md p-4 mb-6 rounded-lg">
					<div className="flex items-center space-x-2">
						<Home className="text-blue-600 w-8 h-8" aria-hidden="true" />
						<h1 className="text-2xl font-bold text-blue-600">Dwellio</h1>
					</div>
				</header>

				<div dangerouslySetInnerHTML={{ __html: product }} />

				<button type="button" aria-label="Finish and go to confirmation page" className="fixed bottom-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700" onClick={() => navigate("/done")}>
					Done
				</button>

			</div>) :
			(<p>No product data available.</p>)
		}
	</div>)

};