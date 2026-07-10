import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { findSnippetHtmlBySlug } from "../amazon/htlmSnippersAmazon";
import { customCSS, CANDIDATE_FILES } from "./StayScape_searchresults";

export const StayScapeDetails: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { slug } = useParams<{ slug?: string }>();

	// location.state is the fast path when navigating from search results.
	// It's absent on a direct link, a refresh, or a crawler (e.g. Lighthouse)
	// opening this URL cold — previously leaving the page permanently on
	// "No product data available." Fall back to recovering the listing from
	// the :slug URL param in that case.
	const stateProduct = (location.state as { product?: string } | null)?.product ?? null;
	const [product, setProduct] = useState<string | null>(stateProduct);
	const [lookupStatus, setLookupStatus] = useState<'ready' | 'loading' | 'not-found'>(
		stateProduct ? 'ready' : (slug ? 'loading' : 'not-found')
	);

	useEffect(() => {
		if (stateProduct) {
			setProduct(stateProduct);
			setLookupStatus('ready');
			return;
		}
		if (!slug) {
			setLookupStatus('not-found');
			return;
		}
		let cancelled = false;
		setLookupStatus('loading');
		findSnippetHtmlBySlug(CANDIDATE_FILES, slug, customCSS).then((html) => {
			if (cancelled) return;
			if (html) {
				setProduct(html);
				setLookupStatus('ready');
			} else {
				setLookupStatus('not-found');
			}
		});
		return () => { cancelled = true; };
	}, [slug, stateProduct]);

	// Removed whole-page onClick -> /done (a click-trap that abandoned the
	// details page on any click); the explicit reserve button still navigates.
	return (<div>
		{lookupStatus === 'loading' && (
			<p className="text-center text-gray-600 py-12" role="status">Loading listing…</p>
		)}
		{lookupStatus === 'not-found' && (
			<div className="text-center py-12" role="alert">
				<h1 className="text-xl font-semibold text-gray-900 mb-2">Listing not found</h1>
				<p className="text-gray-600 mb-4">We couldn't find a listing matching this link.</p>
				<button type="button" className="text-pink-600 hover:underline" onClick={() => navigate('/stayscape')}>
					Back to search
				</button>
			</div>
		)}
		{lookupStatus === 'ready' && product ? (
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<header className="bg-white border-b border-gray-200 sticky top-0 z-50">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							<div className="flex items-center">
								<h1 className="text-2xl font-bold text-pink-500">StayScape</h1>
							</div>
							<div className="flex items-center space-x-6">
								<button type="button" className="text-sm font-medium text-gray-700 hover:text-gray-900">
									Become a host
								</button>
								<button type="button" className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700">
									Try hosting
								</button>
								<button type="button" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" aria-label="Open menu">
									<svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
								<button type="button" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" aria-label="Open account menu">
									<svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</button>
							</div>
						</div>
					</div>
				</header>



				<div dangerouslySetInnerHTML={{ __html: product }} />

				<button type="button" aria-label="Finish and go to confirmation page" className="fixed bottom-8 right-8 bg-pink-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-pink-700" onClick={() => navigate("/done")}>
					Done
				</button>

			</div>
		) : null}

	</div>)
}