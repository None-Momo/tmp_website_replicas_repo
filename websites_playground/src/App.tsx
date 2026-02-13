import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import logo from './logo.svg';
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


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/riverbuy" element={<RiverBuyClone />} />
        <Route path="/riverbuy_search" element={<RiverBuySearchPage />} />
        <Route path="/riverbuy_details" element={<RiverBuyProductDetail />} />

        <Route path="/flight" element={<GoogleFlightsSearch />} />
        <Route path="/flight-results" element={<FlightResults />} />
        <Route path="/flight_details" element={<FlightDetails />} />


        <Route path="/grumble" element={<YelpClone />} />
        <Route path="/grumble_search" element={<YelpSearch />} />
        <Route path="/yelp_details" element={<YelpDetails />} />



        <Route path="/zoomcar" element={<ZoomCarRental />} />
        <Route path="/zoomcar_search" element={<ZoomCarSearchResults />} />
        <Route path='/zoomcar_details' element={<ZoomcarDetail />} />

        <Route path="/stayscape" element={<StayScape />} />
        <Route path="/stayscape_search" element={<StayScapeSearchResults />} />
        <Route path="/stayscape_details" element={<StayScapeDetails />} />


        <Route path="/dwellio" element={<Dwellio />} />
        <Route path="/dwellio_search" element={<DwellioSearch />} />
        <Route path="/dwellio_details" element={<DwellioDetails />} />



        <Route path="/done" element={<DonePage />} />

        <Route path="/dynamic/:pageName" element={<DynamicPage />} />


        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
