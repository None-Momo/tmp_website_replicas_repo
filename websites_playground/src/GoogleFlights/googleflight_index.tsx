import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Users, Plane, ArrowLeftRight, Plus, Minus, ChevronDown, MapPin } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Flight } from './flightAsset';
import { useNavigate } from 'react-router';

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}



const airports: Airport[] = [
  { code: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'USA' },
  { code: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'USA' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'USA' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'USA' },
  { code: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'USA' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'USA' },
  { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'USA' },
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
];


export default function GoogleFlightsSearch() {
  const [origin, setOrigin] = useState('New York (JFK)');
  const [destination, setDestination] = useState('Los Angeles (LAX)');
  const [departureDate, setDepartureDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [returnDate, setReturnDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [tripType, setTripType] = useState('round');
  const [passengers, setPassengers] = useState(1);
  const [travelClass, setTravelClass] = useState('Economy');
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Flight[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
  const passengerRef = useRef<HTMLDivElement>(null);
  const classRef = useRef<HTMLDivElement>(null);


  const navigate = useNavigate();


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setShowDestinationDropdown(false);
      }
      if (passengerRef.current && !passengerRef.current.contains(event.target as Node)) {
        setShowPassengerDropdown(false);
      }
      if (classRef.current && !classRef.current.contains(event.target as Node)) {
        setShowClassDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = () => {

    navigate('/flight-results', { state: { origin, destination, departureDate, returnDate, tripType, passengers, travelClass } });


  };

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const filteredAirports = (query: string) => {
    if (!query) return airports;
    return airports.filter(airport =>
      airport.city.toLowerCase().includes(query.toLowerCase()) ||
      airport.code.toLowerCase().includes(query.toLowerCase()) ||
      airport.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const incrementPassengers = () => {
    setPassengers(prev => Math.min(prev + 1, 9));
  };

  const decrementPassengers = () => {
    setPassengers(prev => Math.max(prev - 1, 1));
  };

  const travelClasses = ['Economy', 'Premium Economy', 'Business', 'First'];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Plane className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-normal text-gray-800">Flights</span>
            </div>
            <nav className="flex space-x-6">
              <button className="text-blue-600 font-medium">Flights</button>
              <button className="text-gray-600 hover:text-gray-800">Hotels</button>
              <button className="text-gray-600 hover:text-gray-800">Car rental</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!hasSearched ? (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex space-x-4 mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="tripType"
                  value="round"
                  checked={tripType === 'round'}
                  onChange={(e) => setTripType(e.target.value)}
                  className="mr-1"
                />
                <span>Round trip</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="tripType"
                  value="one"
                  checked={tripType === 'one'}
                  onChange={(e) => setTripType(e.target.value)}
                  className="mr-1"
                />
                <span>One way</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Origin Input */}
              <div className="relative" ref={originRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="text"
                  value={originQuery || origin}
                  onChange={e => {
                    setOriginQuery(e.target.value);
                    setShowOriginDropdown(true);
                  }}
                  onFocus={() => setShowOriginDropdown(true)}
                  placeholder="City or airport"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {showOriginDropdown && (
                  <ul className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-auto w-full">
                    {filteredAirports(originQuery).map(airport => (
                      <li
                        key={airport.code}
                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                        onClick={() => {
                          setOrigin(`${airport.city} (${airport.code})`);
                          setOriginQuery('');
                          setShowOriginDropdown(false);
                        }}
                      >
                        {airport.city} ({airport.code}) - {airport.name}
                      </li>
                    ))}
                    {filteredAirports(originQuery).length === 0 && (
                      <li className="px-3 py-2 text-gray-500">No results found</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Destination Input */}
              <div className="relative" ref={destinationRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="text"
                  value={destinationQuery || destination}
                  onChange={e => {
                    setDestinationQuery(e.target.value);
                    setShowDestinationDropdown(true);
                  }}
                  onFocus={() => setShowDestinationDropdown(true)}
                  placeholder="City or airport"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {showDestinationDropdown && (
                  <ul className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-auto w-full">
                    {filteredAirports(destinationQuery).map(airport => (
                      <li
                        key={airport.code}
                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                        onClick={() => {
                          setDestination(`${airport.city} (${airport.code})`);
                          setDestinationQuery('');
                          setShowDestinationDropdown(false);
                        }}
                      >
                        {airport.city} ({airport.code}) - {airport.name}
                      </li>
                    ))}
                    {filteredAirports(destinationQuery).length === 0 && (
                      <li className="px-3 py-2 text-gray-500">No results found</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={swapLocations}
                  aria-label="Swap origin and destination"
                  className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departure</label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={e => setDepartureDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Return Date (conditionally rendered) */}
              {tripType === 'round' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    min={departureDate}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              {/* Passengers */}
              <div className="relative" ref={passengerRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
                <button
                  type="button"
                  onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <span>{passengers} {passengers === 1 ? 'Passenger' : 'Passengers'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showPassengerDropdown && (
                  <div className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 p-3 w-48">
                    <div className="flex items-center justify-between mb-2">
                      <span>Passengers</span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={decrementPassengers}
                          disabled={passengers <= 1}
                          className={`p-1 rounded-full border border-gray-400 ${passengers <= 1 ? 'text-gray-300 border-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={incrementPassengers}
                          disabled={passengers >= 9}
                          className={`p-1 rounded-full border border-gray-400 ${passengers >= 9 ? 'text-gray-300 border-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Travel Class */}
              <div className="relative" ref={classRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <button
                  type="button"
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <span>{travelClass}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showClassDropdown && (
                  <ul className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 w-full">
                    {travelClasses.map(cls => (
                      <li
                        key={cls}
                        className={`px-3 py-2 cursor-pointer hover:bg-blue-100 ${cls === travelClass ? 'font-semibold text-blue-600' : ''}`}
                        onClick={() => {
                          setTravelClass(cls);
                          setShowClassDropdown(false);
                        }}
                      >
                        {cls}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSearch}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Search
              </button>
            </div>
          </div>
        ) : (
          <></>
        )}
      </main>
    </div>
  );
}
