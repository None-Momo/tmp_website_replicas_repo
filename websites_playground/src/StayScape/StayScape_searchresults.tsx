import { useEffect, useState } from "react";
import {
	MapPin,
	Search,
	Filter,
	ChevronDown,
	Star,
	Heart,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { set } from "date-fns";
import { naiveMatch, pickBestFileWithDeepseek } from "../utils/pickbestfileDeepseek";
import { DEEPSEEK_API_KEY } from "../utils/deepseek_key";
import HtmlSnippets from "../amazon/htlmSnippersAmazon";



export default function StayScapeSearchResults() {
	const [searchQuery, setSearchQuery] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);


	const [resultsLoaded, setResultsLoaded] = useState(false);
	const [raw, setRaw] = useState("");
	const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

	const staysPerPage = 12;

	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const query = params.get('location') || '';
		setSearchQuery(query);
	}, [location.search]);


	useEffect(() => {
		if (searchQuery.trim() !== "") {
			// use the search term to open the data inside scraped_data/
			let cancelled = false;
			const ctrl = new AbortController();

			const debounce = setTimeout(async () => {
				const newSearchQuery = searchQuery.trim();

				const fileNames = [
					"honolulu_airbnb_cards.txt",
					"NY_airbnb_cards.txt",
					// "amazon_shoe_results_inlined.txt"
				];

				const sidenavbarFileNames = [

				];
				const bestFile = (await pickBestFileWithDeepseek(newSearchQuery, fileNames, DEEPSEEK_API_KEY).catch(e => { console.error(e); return null; }))?.best;
				// console.log('Best file for query:', newSearchQuery, 'is', bestFile);
				if (!bestFile) naiveMatch(newSearchQuery, fileNames);

				if (!cancelled) {
					const src = bestFile ? `/scraped_data/${bestFile}` : "";
					// If your state for the path is named differently, replace setSource with it:
					setRaw(src);
				}


			}, 250);

		}
	}, [searchQuery]);


	const customCSS = `
		/* Hover “lift” */
		.cy5jw6o:hover,
		.cy5jw6o:focus-within {
		transform: translateY(-2px);
		box-shadow: 0 12px 24px rgba(0,0,0,.12);
		}

		/* Common inner media */
		.cy5jw6o img, 
		.cy5jw6o picture img {
		width: 100%;
		height: 220px;     /* medium image height */
		object-fit: cover;
		display: block;
		border-radius: 10px;
		}

		/* Optional: tidy text blocks if present */
		.cy5jw6o [data-testid="listing-card-title"] {
		margin-top: 12px;
		font-size: 1rem;   /* 16px */
		font-weight: 600;
		color: #111827;
		}
		.cy5jw6o [data-testid="listing-card-subtitle"] {
		margin-top: 4px;
		font-size: 0.875rem; /* 14px */
		color: #6b7280;
		}
		div.t1p13dzz.atm_fg_1y6m0gg.dir.dir-ltr > div{
		display: inline-flex;    
		align-items: center;      
		gap: 0.25rem;             
		background-color: #000;   
		color: #fff;              
		font-size: 0.95rem;       
		font-weight: 500;
		padding: 2px 6px;
		border-radius: 0.375rem; 
		line-height: 1.2;
		white-space: nowrap;
		}
		.i7ownue.dir.dir-ltr {
		display: none
		}

		[data-testid="listing-card-title"] {
		font-weight: 700 !important;
		font-size: 20px !important;
		line-height: 1.2 !important;
		color:rgb(0, 0, 0) !important;
		}
		._w3xh25{
		display: inline-flex !important;
		align-items: center !important;

		}
		span.coc2t1u{
		display:none !important;}
		.b1tv82fw.atm_h_esu3gu{
		display:none !important;}


	`;


	return (
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

			{/* Main Search Section */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-center space-x-2 mb-4">
						<button className="text-sm text-gray-600 hover:text-gray-900">Stays</button>
						<button className="text-sm text-gray-400 hover:text-gray-900">Experiences</button>
					</div>

					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
							<Search className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							placeholder="San Diego"
							className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>
			</div>

			<HtmlSnippets source={raw} navigateToDetails={(product) => {
				// navigate("/done") 
				navigate('/stayscape_details', { state: { product } });

			}}
				query={searchQuery} setResultsLoaded={setResultsLoaded}
				customCSSProp={customCSS} selectedFilters={selectedFilters}
				orientation="grid" />




			{/* Footer */}
			<footer className="bg-white border-t border-gray-200 mt-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						<div>
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
							<ul className="space-y-3">
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Help Center
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										AirCover
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Anti-discrimination
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Disability support
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Cancellation options
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Report neighborhood concern
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Hosting</h3>
							<ul className="space-y-3">
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Try hosting
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										AirCover for Hosts
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Hosting resources
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Community forum
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Hosting responsibly
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Join a free Hosting class
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Find a co-host
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="text-sm font-semibold text-gray-900 mb-4">StayScape</h3>
							<ul className="space-y-3">
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										2025 Summer Release
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Newsroom
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										New features
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Careers
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Investors
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Gift cards
									</a>
								</li>
								<li>
									<a href="#" className="text-sm text-gray-600 hover:text-gray-900">
										Emergency stays
									</a>
								</li>
							</ul>
						</div>
					</div>

					<div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
						<div className="flex items-center space-x-4 mb-4 md:mb-0">
							<p className="text-sm text-gray-600">© 2025 StayScape, Inc.</p>
							<div className="flex items-center space-x-4">
								<button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900">
									<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
									</svg>
									<span>English (US)</span>
									<ChevronDown className="h-4 w-4" />
								</button>
								<button className="text-sm text-gray-600 hover:text-gray-900">$ USD</button>
							</div>
						</div>
						<div className="flex items-center space-x-6">
							<a href="#" className="text-sm text-gray-600 hover:text-gray-900">Facebook</a>
							<a href="#" className="text-sm text-gray-600 hover:text-gray-900">X</a>
							<a href="#" className="text-sm text-gray-600 hover:text-gray-900">Instagram</a>
							<a href="#" className="text-sm text-gray-600 hover:text-gray-900">TikTok</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
