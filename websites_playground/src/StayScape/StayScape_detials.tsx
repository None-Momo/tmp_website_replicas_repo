import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const StayScapeDetails: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const product = location?.state?.product;

	return (<div onClick={() => navigate("/done")}>
		{product ? (
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<header className="bg-white border-b border-gray-200 sticky top-0 z-50">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							<div className="flex items-center">
								<h1 className="text-2xl font-bold text-pink-500">StayScape</h1>
							</div>
							<div className="flex items-center space-x-6">
								<button className="text-sm font-medium text-gray-700 hover:text-gray-900">
									Become a host
								</button>
								<button className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-600">
									Try hosting
								</button>
								<button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
								<button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</button>
							</div>
						</div>
					</div>
				</header>



				<div dangerouslySetInnerHTML={{ __html: product }} />

				<button className="fixed bottom-8 right-8 bg-pink-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-pink-600" onClick={() => navigate("/done")}>
					Done
				</button>

			</div>
		) : (
			<p>No product data available.</p>
		)}

	</div>)
}