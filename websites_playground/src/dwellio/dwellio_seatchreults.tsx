import { Home } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HtmlSnippets, { extractSnippetTitle, slugifyTitle } from '../amazon/htlmSnippersAmazon';

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

// The only two cities with a dataset (see the strict city -> file mapping
// below); searched in full when a listing must be recovered from the URL
// alone (no location.state). Hoisted + exported, along with customCSS, so
// dwellio_details.tsx can reuse them exactly.
export const CANDIDATE_FILES = ["Chicago_zillow_articles.txt", "SF_zillow_articles.txt"];

export const customCSS = `
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

const DwellioSearch: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [typeFilter, setTypeFilter] = useState<string>('all');

	const [resultsLoaded, setResultsLoaded] = useState<boolean>(false);
	const [noCityData, setNoCityData] = useState<boolean>(false);
	const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

	const [raw, setRaw] = useState<string>("")
	// const [filteredProperties, setFilteredProperties] = useState<Property[]>(mockProperties);

	const location = useLocation();
	const navigate = useNavigate();

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

				// Strict city -> dataset mapping. The shared pickBestLocalFile
				// helper falls back to the first candidate file when nothing
				// matches, which served San Francisco listings for a Chicago
				// search; an unmatched city must show the empty state instead.
				const q = newSearchQuery.toLowerCase();
				const bestFile = /chicago|illinois/.test(q)
					? "Chicago_zillow_articles.txt"
					: /san francisco|\bsf\b|bay area/.test(q)
						? "SF_zillow_articles.txt"
						: null;

				if (!cancelled) {
					// No dataset for this city: show the empty state instead of
					// silently serving another city's listings.
					const src = bestFile ? `/scraped_data/${bestFile}` : "";
					setRaw(src);
					setNoCityData(!bestFile);
					if (!bestFile) setResultsLoaded(true);
				}


			}, 250);

		}
	}, [searchQuery]);

	return (
		<div className="min-h-screen bg-gray-50 p-4">

			<header className="bg-white shadow-md p-4 mb-6 rounded-lg">
				<div className="flex items-center space-x-2">
						<Home className="text-blue-600 w-8 h-8" aria-hidden="true" />
					<h1 className="text-2xl font-bold text-blue-600">Dwellio</h1>
				</div>
				<div className="flex flex-col md:flex-row gap-4">
						<input
							type="text"
							aria-label="Search by address"
							placeholder="Search by address..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
						<select
							aria-label="Property type"
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


			{/* App.tsx already wraps every route in <main id="main-content">; a
			    second, nested <main> here made duplicate main landmarks, which
			    breaks screen-reader landmark navigation. */}
			<div>
				<h2 className="sr-only">Search results{searchQuery ? ` for ${searchQuery}` : ''}</h2>
				{!resultsLoaded && searchQuery.trim() !== "" && (
					<p className="text-gray-500 mb-4" role="status">Loading results...</p>
				)}

				{noCityData && searchQuery.trim() !== "" && (
					<p className="text-gray-600 mb-4" role="status">
						No listings found for "{searchQuery.trim()}". Try Chicago or San Francisco.
					</p>
				)}

				{/* Must render unconditionally (like the other sites): HtmlSnippets
				    is what flips resultsLoaded, so gating it on resultsLoaded left
				    the page stuck on "Loading results..." forever. */}
				{!noCityData && <HtmlSnippets
					source={raw} navigateToDetails={(product) => {
						// navigate("/done")
						// Also encode the listing in the URL so the detail page
						// can recover it without location.state (direct link,
						// refresh, or a crawler like Lighthouse).
						const slug = slugifyTitle(extractSnippetTitle(product));
						navigate(slug ? `/dwellio_details/${slug}` : "/dwellio_details", { state: { product } })
					}}
					query={searchQuery} setResultsLoaded={setResultsLoaded}
					orientation='grid' selectedFilters={selectedFilters}
					customCSSProp={customCSS} />}
			</div>
		</div>
	);
};

export default DwellioSearch;
