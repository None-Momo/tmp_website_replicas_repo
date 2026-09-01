import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useLocation } from "react-router-dom";
import { Car } from 'lucide-react';
import { findSnippetHtmlBySlug } from '../amazon/htlmSnippersAmazon';
import { customCSS, CANDIDATE_FILES } from './zoomcar_searchresults';

export const ZoomcarDetail: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { slug } = useParams<{ slug?: string }>();
	const stateCarData = (location?.state as { car_data?: string } | null)?.car_data ?? null;
	const [carData, setCarData] = useState<string | null>(stateCarData);

	// location.state is the fast path when navigating from search results.
	// It's absent on a direct link, a refresh, or a crawler (e.g. Lighthouse)
	// opening this URL cold — previously leaving the page permanently on
	// "No car data available." Fall back to recovering the vehicle from the
	// :slug URL param in that case.
	const [lookupStatus, setLookupStatus] = useState<'ready' | 'loading' | 'not-found'>(
		stateCarData ? 'ready' : (slug ? 'loading' : 'not-found')
	);

	useEffect(() => {
		if (stateCarData) {
			setCarData(stateCarData);
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
				setCarData(html);
				setLookupStatus('ready');
			} else {
				setLookupStatus('not-found');
			}
		});
		return () => { cancelled = true; };
	}, [stateCarData, slug]);


	// Removed whole-page onClick -> /done (a click-trap): the "open its details"
	// task should stay on the details page, not jump to /done on any click.
	return (<div>
		{/* <h1>Zoomcar Detail Page</h1> */}
		{lookupStatus === 'loading' && (
			<p className="text-center text-gray-600 py-12" role="status">Loading car…</p>
		)}
		{lookupStatus === 'not-found' && (
			<div className="text-center py-12" role="alert">
				<h1 className="text-xl font-semibold text-gray-900 mb-2">Car not found</h1>
				<p className="text-gray-600 mb-4">We couldn't find a car matching this link.</p>
				<button type="button" className="text-red-600 hover:underline" onClick={() => navigate('/zoomcar')}>
					Back to search
				</button>
			</div>
		)}
		{lookupStatus === 'ready' && carData ? (
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<header className="bg-white text-white py-4 px-6">
					<div className="container mx-auto flex justify-between items-center">
						<div className="flex items-center space-x-2 ">
							<Car className="h-8 w-8 text-red-600" aria-hidden="true" />
							<span className="font-bold text-2xl text-gray-900">ZoomCar</span>
						</div>
						<nav aria-label="ZoomCar sections">
							<ul className="flex space-x-6">
								<li><button type="button" className="hover:underline">Locations</button></li>
								<li><button type="button" className="hover:underline">Deals</button></li>
								<li><button type="button" className="hover:underline">My Account</button></li>
							</ul>
						</nav>
					</div>
				</header>
				<h1 className="sr-only">Car rental details</h1>
				{/* The injected snippet's own title is an <h3> (scraped markup);
				    this sr-only h2 keeps the heading outline from skipping a
				    level (h1 -> h3), so heading-based navigation stays coherent. */}
				<h2 className="sr-only">Selected vehicle</h2>
				{/* The injected snippet's "Pay Later" / "Pay Now" CTAs are inert
				    scraped markup; sanitize() exposes them as named role="button"
				    tabindex="0" controls, and this delegate wires their activation
				    (mouse click, Enter/Space, or a screen reader's press — which
				    dispatches a click) so the booking flow can be completed
				    without a mouse, mirroring the other replicas' detail pages
				    whose action buttons navigate to /done. */}
				<div
					onClick={(e) => {
						const target = e.target as HTMLElement;
						if (target.closest('#res-vehicles-pay-later, #res-vehicles-pay-now')) navigate('/done');
					}}
					onKeyDown={(e) => {
						if (e.key !== 'Enter' && e.key !== ' ') return;
						const target = e.target as HTMLElement;
						if (!target.closest('#res-vehicles-pay-later, #res-vehicles-pay-now')) return;
						e.preventDefault();
						navigate('/done');
					}}
					dangerouslySetInnerHTML={{ __html: carData }}
				/>
			</div>
		) : null}
	</div>)

};
