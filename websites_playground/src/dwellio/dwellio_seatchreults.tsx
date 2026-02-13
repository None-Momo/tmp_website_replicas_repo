import { Home } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HtmlSnippets from '../amazon/htlmSnippersAmazon';
import { naiveMatch, pickBestFileWithDeepseek } from '../utils/pickbestfileDeepseek';
import { DEEPSEEK_API_KEY } from '../utils/deepseek_key';

type Property = {
	id: number;
	image: string;
	price: number;
	address: string;
	beds: number;
	baths: number;
	sqft: number;
	type: string;
};


const DwellioSearch: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [typeFilter, setTypeFilter] = useState<string>('all');

	const [resultsLoaded, setResultsLoaded] = useState<boolean>(false);
	const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

	const [raw, setRaw] = useState<string>("")
	// const [filteredProperties, setFilteredProperties] = useState<Property[]>(mockProperties);

	const location = useLocation();
	const navigate = useNavigate();

	const customCSS = `
	[data-test="property-card"]{
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		transition: box-shadow 0.3s ease;
		width: 500px;}
		
	.StyledPropertyCardDataArea-c11n-8-109-3__sc-10i1r6-0{
		padding: 0.5rem;
		font-size: 1rem;
		color: #374151;

	}
	address{color: #6b7280 !important;
		font-size: 0.875rem !important;}
	.tCgTM{
	font-weight: 700 !important;
	font-size: 1.05rem !important;
	padding: 0 !important;
	line-height: 1.3 !important;
	max-width: 100% !important;
	text-overflow: ellipsis !important;}
	article{
	padding: 0.5rem !important;}
	.StyledPropertyCardDataArea-c11n-8-109-3__sc-10i1r6-0 > :nth-child(2) {
		font-weight: 700;          
		font-size: 1.25rem;
		line-height: 1.3;
		color:rgb(251, 15, 11) !important;
	}
	.bcrfLm{
		color:rgb(6, 125, 14) !important;
		font-weight: 600 !important;
		font-size: 0.95rem !important;
		}
	.StyledPropertyCardHomeDetailsList-c11n-8-109-3__sc-1j0som5-0{
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	background-color: #f9fafb;
	padding: 0.5rem;
	width: fit-content;}
	[aria-hidden="true"]{
	  display: none;}
	.VisuallyHidden-c11n-8-109-3__sc-t8tewe-0{
	  display: none;}
	  img{
	  width: 80%;}
		`;

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const query = params.get('location') || '';
		setSearchQuery(query);
	}, [location.search]);

	useEffect(() => {
		const filters = typeFilter === 'all' ? [] : [typeFilter];
		setSelectedFilters(filters);

	}, [typeFilter])


	useEffect(() => {
		if (searchQuery.trim() !== "") {
			// use the search term to open the data inside scraped_data/
			let cancelled = false;
			const ctrl = new AbortController();

			const debounce = setTimeout(async () => {
				const newSearchQuery = searchQuery.trim();

				const fileNames = [
					"SF_zillow_articles.txt",
					"NY_zillow_articles.txt",
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

	return (
		<div className="min-h-screen bg-gray-50 p-4">

			<header className="bg-white shadow-md p-4 mb-6 rounded-lg">
				<div className="flex items-center space-x-2">
					<Home className="text-blue-600 w-8 h-8" />
					<h1 className="text-2xl font-bold text-blue-600">Dwellio</h1>
				</div>
				<div className="flex flex-col md:flex-row gap-4">
					<input
						type="text"
						placeholder="Search by address..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<select
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
						className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="all">All Types</option>
						<option value="house">House</option>
						<option value="apartment">Apartment</option>
						<option value="condo">Condo</option>
					</select>
				</div>
			</header>


			<main>
				{!resultsLoaded && searchQuery.trim() !== "" && (
					<p className="text-gray-500 mb-4">Loading results...</p>
				)}

				{resultsLoaded && <HtmlSnippets
					source={raw} navigateToDetails={(product) => {
						// navigate("/done")
						navigate("/dwellio_details", { state: { product } })
					}}
					query={searchQuery} setResultsLoaded={setResultsLoaded}
					orientation='grid' selectedFilters={selectedFilters}
					customCSSProp={customCSS} />}
			</main>
		</div>
	);
};

export default DwellioSearch;
