import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import GoogleFlightsSearch from './GoogleFlights/googleflight_index';
import YelpSearch from './Yelp/yelp_searchresults';
import RiverBuyClone from './amazon/amazon_index';
import RiverBuySearchPage from './amazon/amazon_searchresults';
import YelpClone from './Yelp/yelp_index';
import RiverBuyProductDetail from './amazon/amazon_productdetails';
import { FlightResults } from './GoogleFlights/flight_results';
import { DonePage } from './utils/done_page';
import ZoomCarRental from './zoomcar/zoomcar_index';
import ZoomCarSearchResults from './zoomcar/zoomcar_searchresults';
import StayScape from './StayScape/StayScape_index';
import StayScapeSearchResults from './StayScape/StayScape_searchresults';
import DwellioSearch from './dwellio/dwellio_seatchreults';
import Dwellio from './dwellio/dwellio_index';
import { ZoomcarDetail } from './zoomcar/zoomcar_detail';
import { FlightDetails } from './GoogleFlights/flight_detials';
import { YelpDetails } from './Yelp/yelp_details';
import { StayScapeDetails } from './StayScape/StayScape_detials';
import { DwellioDetails } from './dwellio/dwellio_details';
import { DynamicPage } from './amazon/dynamicPage_index';

const pageTitles: Array<[RegExp, string]> = [
  [/^\/riverbuy_details/, 'RiverBuy Product Details'],
  [/^\/riverbuy_search/, 'RiverBuy Search Results'],
  [/^\/riverbuy/, 'RiverBuy'],
  [/^\/flight-results/, 'Flight Search Results'],
  [/^\/flight_details/, 'Flight Details'],
  [/^\/flight/, 'Flight Search'],
  [/^\/grumble_search/, 'Grumble Search Results'],
  [/^\/grumble/, 'Grumble'],
  [/^\/yelp_details/, 'Grumble Business Details'],
  [/^\/zoomcar_search/, 'ZoomCar Search Results'],
  [/^\/zoomcar_details/, 'ZoomCar Details'],
  [/^\/zoomcar/, 'ZoomCar'],
  [/^\/stayscape_search/, 'StayScape Search Results'],
  [/^\/stayscape_details/, 'StayScape Details'],
  [/^\/stayscape/, 'StayScape'],
  [/^\/dwellio_search/, 'Dwellio Search Results'],
  [/^\/dwellio_details/, 'Dwellio Details'],
  [/^\/dwellio/, 'Dwellio'],
  [/^\/done/, 'Task Complete'],
  [/^\/dynamic\//, 'Dynamic Page'],
];

function PageMetadata() {
  const location = useLocation();

  useEffect(() => {
    const match = pageTitles.find(([pattern]) => pattern.test(location.pathname));
    document.title = match ? `${match[1]} | Fake Websites` : 'Fake Websites';
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <PageMetadata />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {/* A <main> landmark (not a plain <div>) so screen reader users can jump
          straight to page content; Lighthouse's "Document does not have a
          main landmark" flagged every route before this. */}
      <main id="main-content" tabIndex={-1}>
      <Routes>
        <Route path="/riverbuy" element={<RiverBuyClone />} />
        <Route path="/riverbuy_search" element={<RiverBuySearchPage />} />
        <Route path="/riverbuy_details" element={<RiverBuyProductDetail />} />
        <Route path="/riverbuy_details/:slug" element={<RiverBuyProductDetail />} />

        <Route path="/flight" element={<GoogleFlightsSearch />} />
        <Route path="/flight-results" element={<FlightResults />} />
        <Route path="/flight_details" element={<FlightDetails />} />
        <Route path="/flight_details/:slug" element={<FlightDetails />} />


        <Route path="/grumble" element={<YelpClone />} />
        <Route path="/grumble_search" element={<YelpSearch />} />
        <Route path="/yelp_details" element={<YelpDetails />} />
        <Route path="/yelp_details/:slug" element={<YelpDetails />} />



        <Route path="/zoomcar" element={<ZoomCarRental />} />
        <Route path="/zoomcar_search" element={<ZoomCarSearchResults />} />
        <Route path='/zoomcar_details' element={<ZoomcarDetail />} />
        <Route path='/zoomcar_details/:slug' element={<ZoomcarDetail />} />

        <Route path="/stayscape" element={<StayScape />} />
        <Route path="/stayscape_search" element={<StayScapeSearchResults />} />
        <Route path="/stayscape_details" element={<StayScapeDetails />} />
        <Route path="/stayscape_details/:slug" element={<StayScapeDetails />} />


        <Route path="/dwellio" element={<Dwellio />} />
        <Route path="/dwellio_search" element={<DwellioSearch />} />
        <Route path="/dwellio_details" element={<DwellioDetails />} />
        <Route path="/dwellio_details/:slug" element={<DwellioDetails />} />



        <Route path="/done" element={<DonePage />} />

        <Route path="/dynamic/:pageName" element={<DynamicPage />} />


        <Route path="*" element={<Navigate to="/riverbuy" replace />} />
      </Routes>
      </main>
    </Router>
  );
}

export default App;
