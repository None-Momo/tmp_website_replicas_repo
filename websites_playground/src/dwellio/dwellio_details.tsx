import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Home } from 'lucide-react';
import { findSnippetHtmlBySlug } from "../amazon/htlmSnippersAmazon";
import { customCSS, CANDIDATE_FILES } from "./dwellio_seatchreults";

export const DwellioDetails: React.FC = () => {
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
	// details page on any click); the explicit button below still navigates.
	return (<div>
		{lookupStatus === 'loading' && (
			<p className="text-center text-gray-600 py-12" role="status">Loading listing…</p>
		)}
		{lookupStatus === 'not-found' && (
			<div className="text-center py-12" role="alert">
				<h1 className="text-xl font-semibold text-gray-900 mb-2">Listing not found</h1>
				<p className="text-gray-600 mb-4">We couldn't find a listing matching this link.</p>
				<button type="button" className="text-blue-600 hover:underline" onClick={() => navigate('/dwellio')}>
					Back to search
				</button>
			</div>
		)}
		{lookupStatus === 'ready' && product ? (
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

			</div>
		) : null}
	</div>)

};