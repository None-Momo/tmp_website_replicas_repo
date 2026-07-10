import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { findSnippetHtmlBySlug } from "../amazon/htlmSnippersAmazon";
import { customCSS, CANDIDATE_FILES } from "./yelp_searchresults";

export const YelpDetails: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { slug } = useParams<{ slug?: string }>();

	// location.state is the fast path when navigating from search results.
	// It's absent on a direct link, a refresh, or a crawler (e.g. Lighthouse)
	// opening this URL cold — previously leaving the page permanently on
	// "No product data available." Fall back to recovering the business from
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

	// The whole page previously navigated to /done on ANY click, so an agent
	// (or user) that reached the correct business details was yanked away the
	// moment it clicked anything to explore. The explicit "Go to Done Page"
	// button below still provides that action.
	return (<div>
		{lookupStatus === 'loading' && (
			<p className="text-center text-gray-600 py-12" role="status">Loading business…</p>
		)}
		{lookupStatus === 'not-found' && (
			<div className="text-center py-12" role="alert">
				<h1 className="text-xl font-semibold text-gray-900 mb-2">Business not found</h1>
				<p className="text-gray-600 mb-4">We couldn't find a business matching this link.</p>
				<button type="button" className="text-red-600 hover:underline" onClick={() => navigate('/grumble')}>
					Back to search
				</button>
			</div>
		)}
		{lookupStatus === 'ready' && product ? (
			<div className="min-h-screen bg-gray-50">
				<header className="bg-red-600 text-white">
					<div className="max-w-7xl mx-auto px-4 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<h1 className="text-2xl font-bold">grumble</h1>
								<nav className="hidden md:flex space-x-6" aria-label="Grumble business links">
									<button type="button" className="hover:text-red-200">For Business</button>
									<button type="button" className="hover:text-red-200">Write a Review</button>
								</nav>
							</div>
							<div className="flex items-center space-x-4">
								<button type="button" className="hover:text-red-200">Sign In</button>
								<button type="button" className="bg-white text-red-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100">
									Sign Up
								</button>
							</div>
						</div>
					</div>
				</header>

				<div dangerouslySetInnerHTML={{ __html: product }} />
				<button type="button" className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-blue-700" onClick={() => navigate("/done")}>Go to Done Page</button>
			</div>
		) : null}

	</div>)
}
