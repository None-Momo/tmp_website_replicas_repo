import React, { useState, useEffect } from 'react';
import { Search, MapPin, ShoppingCart, Menu, ChevronDown, Star, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from "react-router";

import HtmlSnippets from './htlmSnippersAmazon';
import { SidebarFromFile } from './side_bar';
import { pickBestLocalFile } from '../utils/pickbestfileDeepseek';


interface Product {
	id: number;
	title: string;
	price: number;
	originalPrice?: number;
	rating: number;
	reviews: number;
	prime: boolean;
	freeShipping: boolean;
	brand: string;
	category: string;
	bestSeller?: boolean;
	amazonChoice?: boolean;
}






export default function RiverBuySearchPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [tempSearchQuery, setTempSearchQuery] = useState('');

	const [selectedCategory, setSelectedCategory] = useState('All');
	const [cartCount, setCartCount] = useState(0);


	let navigate = useNavigate();

	const [raw, setRaw] = useState<string>('');

	const [rawSidebar, setRawSidebar] = useState<string>('');

	const [searchParams] = useSearchParams();

	const [resultsLoaded, setResultsLoaded] = useState(false);

	const [selectedFilter, setSelectedFilter] = useState<Array<string>>([]);

	const categories = ['All', 'Electronics', 'Computers', 'Smart Home', 'Arts & Crafts', 'Automotive', 'Baby', 'Beauty', 'Books', 'Fashion', 'Food', 'Health', 'Home', 'Sports', 'Toys'];



	//check if there is a search query in the URL
	useEffect(() => {
		const query = searchParams.get('query');
		const category = searchParams.get('category');

		if (query) {
			setSearchQuery(query);
			setTempSearchQuery(query);
		}

		if (category) {
			setSelectedCategory(category);
		}
	}, [searchParams]);

	useEffect(() => {
		let cancelled = false;
		const ctrl = new AbortController();
		const debounce = setTimeout(async () => {
			const newSearchQuery = searchQuery.trim();

			const fileNames = [
				"amazon_shoes_results.txt",
				"amazon_headphones_results.txt",
				"amazon_milk_results.txt",
				// "amazon_shoe_results_inlined.txt"
			];

			const sidenavbarFileNames = [
				"amazon_shoes_sidebar.txt",
				"amazon_milk_sidebar.txt",
				"amazon_headphones_sidebar.txt",
			];

			const bestResults = pickBestLocalFile(newSearchQuery, fileNames);

			if (!cancelled) {
				const src = bestResults ? `/scraped_data/${bestResults}` : "";
				// If your state for the path is named differently, replace setSource with it:
				setRaw(src);
			}

			const bestSidebar = pickBestLocalFile(newSearchQuery, sidenavbarFileNames);

			if (!cancelled) {
				const srcSidebar = bestSidebar ? `/scraped_data/${bestSidebar}` : "";
				// Replace with your setter name if different:
				setRawSidebar(srcSidebar);
			}
		}, 250); // debounce ms

		return () => {
			cancelled = true;
			ctrl.abort();
			clearTimeout(debounce);
		};
	}, [searchQuery]);


	const navigateToDetails = (product: string) => {
		//use react-router to navigate to /product_details with the product id saved in state
		navigate('/riverbuy_details', { state: { product } });

	}



	return (
		<div className="min-h-screen bg-white">
			{/* Header */}
			<header className="bg-slate-900">
				<div className="flex items-center px-4 py-2">
					{/* Logo */}
					<div className="flex items-center mr-4">
						<div className="text-white font-bold text-2xl px-2">RiverBuy</div>
					</div>

					{/* Deliver to */}
						<button type="button" className="flex items-center text-white mr-4 hover:border hover:border-white p-1" aria-label="Delivery location: New York 10001">
							<MapPin size={20} aria-hidden="true" />
							<div className="ml-1">
								<div className="text-xs text-gray-300">Deliver to</div>
								<div className="text-sm font-bold">New York 10001</div>
							</div>
						</button>

					{/* Search Bar */}
					<div className="flex-1 flex">
							<select
								aria-label="Search category"
								className="px-2 py-2 bg-gray-100 text-gray-700 text-sm rounded-l border-r border-gray-300 hover:bg-gray-200 cursor-pointer"
							value={selectedCategory}
							onChange={(e) => {
								setSelectedCategory(e.target.value)
							}}
						>
							{categories.map(cat => (
								<option key={cat} value={cat}>{cat}</option>
							))}
						</select>
							<input
								type="text"
								className="flex-1 px-3 py-2 text-gray-900"
								aria-label="Search RiverBuy"
								placeholder="Search RiverBuy"
							value={tempSearchQuery}
							onChange={(e) => setTempSearchQuery(e.target.value)}

							//if user presses enter, set the search query to the temp search query
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									setSearchQuery(tempSearchQuery);
								}
							}}
						/>
							<button type="button" aria-label="Search RiverBuy" className="bg-orange-400 px-4 rounded-r hover:bg-orange-500" onClick={() => setSearchQuery(tempSearchQuery)}>
								<Search className="text-slate-900" size={22} aria-hidden="true" />
							</button>
						</div>

					{/* Account */}
						<button type="button" className="flex items-center ml-4 text-white hover:border hover:border-white p-1">
							<div>
								<div className="text-xs">Hello, sign in</div>
								<div className="text-sm font-bold flex items-center">
									Account & Lists <ChevronDown size={14} className="ml-1" aria-hidden="true" />
								</div>
							</div>
						</button>

					{/* Returns */}
						<button type="button" className="ml-4 text-white hover:border hover:border-white p-1">
							<div className="text-xs">Returns</div>
							<div className="text-sm font-bold">& Orders</div>
						</button>

					{/* Cart */}
						<button type="button" className="ml-4 flex items-center text-white hover:border hover:border-white p-1" aria-label={`Cart with ${cartCount} items`}>
							<div className="relative">
								<ShoppingCart size={32} aria-hidden="true" />
								<span className="absolute -top-1 -right-1 bg-orange-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold" aria-hidden="true">
									{cartCount}
								</span>
							</div>
							<span className="ml-1 font-bold">Cart</span>
						</button>
					</div>

					{/* Secondary Nav */}
					<nav className="bg-slate-800 text-white flex items-center px-4 py-2 text-sm" aria-label="RiverBuy sections">
						<button type="button" className="flex items-center hover:border hover:border-white p-1 mr-4">
							<Menu size={20} className="mr-1" aria-hidden="true" />
							<span className="font-bold">All</span>
						</button>
						<div className="flex space-x-4">
							{['Today\'s Deals', 'Customer Service', 'Registry', 'Gift Cards', 'Sell'].map(item => (
								<button type="button" key={item} className="hover:border hover:border-white p-1">{item}</button>
							))}
						</div>
					</nav>
				</header>

				{/* Main Content */}
				<main className="flex">
				{/* Sidebar Filters */}
				{resultsLoaded && <div className="w-64 p-4 border-r">

					{rawSidebar && <SidebarFromFile
						filePath={rawSidebar}
						selectedFilter={selectedFilter}
						setSelectedFilter={setSelectedFilter}
					/>}

				</div>}

				{/* Raw HTML Content Display */}
				<div className="flex-1 p-4">
					{raw ? (
						<div className="border-l border-gray-200 p-4">
							<div className="mb-4 pb-2 border-b">
								<h1 className="text-lg font-medium">Search Results for "{searchQuery}"</h1>
							</div>
							<HtmlSnippets source={raw} navigateToDetails={navigateToDetails} query={searchQuery}
								setResultsLoaded={setResultsLoaded}
								selectedFilters={selectedFilter} />
						</div>
					) : searchQuery ? (
						<div className="flex-1 p-8 text-center">
							{/* <div className="mb-4 text-gray-500">
								<Search size={48} className="mx-auto mb-3 opacity-40" />
								<p className="text-lg">No matching results found for "{searchQuery}"</p>
								<p className="text-sm mt-2">Try another search term or browse our products below</p>
							</div> */}
						</div>
						) : null}
					</div>
					</main>


				{/* Footer */}
			<footer className="bg-slate-800 text-white mt-12">
					<a href="#main-content" className="block text-center py-4 bg-slate-700 hover:bg-slate-600">
						<span className="text-sm">Back to top</span>
					</a>
				<div className="px-8 py-8 grid grid-cols-4 gap-8">
					<div>
						<h4 className="font-bold mb-2">Get to Know Us</h4>
						<div className="space-y-1 text-sm text-gray-300">
								<div>Careers</div>
								<div>Blog</div>
								<div>About RiverBuy</div>
								<div>Investor Relations</div>
						</div>
					</div>
					<div>
						<h4 className="font-bold mb-2">Make Money with Us</h4>
						<div className="space-y-1 text-sm text-gray-300">
								<div>Sell products on RiverBuy</div>
								<div>Sell on RiverBuy Business</div>
								<div>Sell apps on RiverBuy</div>
								<div>Become an Affiliate</div>
						</div>
					</div>
					<div>
						<h4 className="font-bold mb-2">RiverBuy Payment Products</h4>
						<div className="space-y-1 text-sm text-gray-300">
								<div>RiverBuy Business Card</div>
								<div>Shop with Points</div>
								<div>Reload Your Balance</div>
								<div>RiverBuy Currency Converter</div>
						</div>
					</div>
					<div>
						<h4 className="font-bold mb-2">Let Us Help You</h4>
						<div className="space-y-1 text-sm text-gray-300">
								<div>RiverBuy and COVID-19</div>
								<div>Your Account</div>
								<div>Your Orders</div>
								<div>Shipping Rates & Policies</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
