import React from "react";


export const DonePage: React.FC = () => {


	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-4">
			<div className="bg-white p-8 rounded-lg shadow-md text-center">
				<h1 className="text-3xl font-bold mb-4 text-green-600">Thank You!</h1>
				<p className="text-lg text-gray-700 mb-6">Your submission has been received successfully.</p>
				<div className="mb-6">
					<svg
						className="w-16 h-16 text-green-500 mx-auto"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2l4 -4m6 2a9 9 0 11 -18 0a9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<p className="text-sm text-gray-500">You can now close this window.</p>
			</div>
		</div>)
}
