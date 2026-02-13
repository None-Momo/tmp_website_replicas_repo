import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const YelpDetails: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const product = location?.state?.product;


	return (<div onClick={() => navigate("/done")}>
		{product ? (
			<div className="min-h-screen bg-gray-50">
				<header className="bg-red-600 text-white">
					<div className="max-w-7xl mx-auto px-4 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<h1 className="text-2xl font-bold">grumble</h1>
								<nav className="hidden md:flex space-x-6">
									<button className="hover:text-red-200">For Business</button>
									<button className="hover:text-red-200">Write a Review</button>
								</nav>
							</div>
							<div className="flex items-center space-x-4">
								<button className="hover:text-red-200">Sign In</button>
								<button className="bg-white text-red-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100">
									Sign Up
								</button>
							</div>
						</div>
					</div>
				</header>

				<div dangerouslySetInnerHTML={{ __html: product }} />
				<button className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-blue-700" onClick={() => navigate("/done")}>Go to Done Page</button>
			</div>) : (
			<p>No product data available.</p>
		)}

	</div>)
}
