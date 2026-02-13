import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { naiveMatch, pickBestFileWithDeepseek } from '../utils/pickbestfileDeepseek';
import { DEEPSEEK_API_KEY } from '../utils/deepseek_key';
import HtmlSnippets from '../amazon/htlmSnippersAmazon';
import Map from './map_comp';

interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  text: string;
  helpful: number;
}

interface CoffeeShop {
  id: string;
  name: string;
  description?: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  distance: number;
  address: string;
  neighborhood: string;
  hours: string;
  categories: string[];
  popularItems: string[];
  amenities: string[];
  phone: string;
  reviews: Review[];
  images: number;
  isFavorite: boolean;
}

const mockCoffeeShops: CoffeeShop[] = [
  {
    id: '1',
    name: 'Blue Bottle Coffee',
    rating: 4.5,
    reviewCount: 842,
    priceLevel: 3,
    distance: 0.3,
    address: '456 Market St',
    neighborhood: 'Downtown',
    hours: '6:00 AM - 7:00 PM',
    categories: ['Coffee & Tea', 'Breakfast', 'WiFi Spot'],
    popularItems: ['Gibraltar', 'New Orleans Iced Coffee', 'Liege Waffle'],
    amenities: ['WiFi', 'Outdoor Seating', 'Dog Friendly', 'Wheelchair Accessible'],
    phone: '(415) 555-0132',
    images: 245,
    isFavorite: false,
    reviews: [
      {
        id: 'r1',
        userName: 'Sarah M.',
        userAvatar: 'SM',
        rating: 5,
        date: '2 days ago',
        text: 'Best coffee in the city! The baristas really know their craft. The Gibraltar is perfectly balanced and the atmosphere is great for working.',
        helpful: 12
      },
      {
        id: 'r2',
        userName: 'Mike R.',
        userAvatar: 'MR',
        rating: 4,
        date: '1 week ago',
        text: 'Great coffee but a bit pricey. The New Orleans style iced coffee is amazing though.',
        helpful: 8
      }
    ]
  },
  {
    id: '2',
    name: 'Ritual Coffee Roasters',
    rating: 4.3,
    reviewCount: 567,
    priceLevel: 2,
    distance: 0.5,
    address: '1026 Valencia St',
    neighborhood: 'Mission',
    hours: '6:30 AM - 6:00 PM',
    categories: ['Coffee Roasters', 'Coffee & Tea', 'Study Spot'],
    popularItems: ['Cappuccino', 'Pour Over', 'Seasonal Blend'],
    amenities: ['WiFi', 'Laptop Friendly', 'Outdoor Seating'],
    phone: '(415) 555-0145',
    images: 189,
    isFavorite: true,
    reviews: [
      {
        id: 'r3',
        userName: 'Emma L.',
        userAvatar: 'EL',
        rating: 5,
        date: '3 days ago',
        text: 'Love this place! Great for studying and the coffee is consistently excellent.',
        helpful: 15
      }
    ]
  },
  {
    id: '3',
    name: 'Philz Coffee',
    rating: 4.7,
    reviewCount: 1234,
    priceLevel: 2,
    distance: 0.8,
    address: '3101 24th St',
    neighborhood: 'Mission',
    hours: '5:30 AM - 8:00 PM',
    categories: ['Coffee & Tea', 'Custom Blends'],
    popularItems: ['Mint Mojito', 'Tesora', 'Philtered Soul'],
    amenities: ['WiFi', 'Mobile Order', 'Rewards Program'],
    phone: '(415) 555-0178',
    images: 412,
    isFavorite: false,
    reviews: [
      {
        id: 'r4',
        userName: 'James K.',
        userAvatar: 'JK',
        rating: 5,
        date: '1 day ago',
        text: 'The Mint Mojito is life-changing! Sweet, creamy, and minty - unlike any coffee I\'ve had.',
        helpful: 23
      }
    ]
  },
  {
    id: '4',
    name: 'Sightglass Coffee',
    rating: 4.4,
    reviewCount: 892,
    priceLevel: 3,
    distance: 1.2,
    address: '270 7th St',
    neighborhood: 'SOMA',
    hours: '7:00 AM - 6:00 PM',
    categories: ['Coffee Roasters', 'Bakery', 'Brunch'],
    popularItems: ['Affogato', 'Cold Brew', 'Croissant'],
    amenities: ['WiFi', 'Full Kitchen', 'Event Space', 'Outdoor Seating'],
    phone: '(415) 555-0199',
    images: 334,
    isFavorite: false,
    reviews: [
      {
        id: 'r5',
        userName: 'Lisa T.',
        userAvatar: 'LT',
        rating: 4,
        date: '5 days ago',
        text: 'Beautiful space in an old factory. Coffee is excellent and the pastries are made in-house.',
        helpful: 19
      }
    ]
  },
  {
    id: '5',
    name: 'Four Barrel Coffee',
    rating: 4.2,
    reviewCount: 445,
    priceLevel: 2,
    distance: 1.5,
    address: '375 Valencia St',
    neighborhood: 'Mission',
    hours: '7:00 AM - 5:00 PM',
    categories: ['Coffee & Tea', 'Artisan Coffee'],
    popularItems: ['Espresso', 'Drip Coffee', 'Cortado'],
    amenities: ['No WiFi', 'Standing Bar', 'Bike Parking'],
    phone: '(415) 555-0211',
    images: 156,
    isFavorite: false,
    reviews: [
      {
        id: 'r6',
        userName: 'Tom B.',
        userAvatar: 'TB',
        rating: 4,
        date: '1 week ago',
        text: 'Serious coffee for serious coffee drinkers. No WiFi keeps it focused on the coffee.',
        helpful: 11
      }
    ]
  }
];

export default function YelpSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'reviews'>('rating');
  const [shops, setShops] = useState(mockCoffeeShops);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [raw, setRaw] = useState<string>();
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<Array<string>>([]);


  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const next: string[] = [];
    if (selectedPrice && selectedPrice > 0) next.push('$'.repeat(selectedPrice));
    if (selectedRating && selectedRating > 0) next.push(String(selectedRating));

    setSelectedFilter(prev => {
      // shallow equality check to avoid redundant state updates
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) {
        return prev;
      }
      return next;
    });
  }, [selectedPrice, selectedRating]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('query') || '';
    setSearchTerm(query);
  }, [location.search]);

  useEffect(() => {
    if (searchTerm) {
      // use the search term to open the data inside scraped_data/
      let cancelled = false;
      const ctrl = new AbortController();

      const debounce = setTimeout(async () => {
        const newSearchQuery = searchTerm.trim();

        const fileNames = [
          "yelp_coffee.txt",
          "yelp_restaurants.txt",
          // "amazon_shoe_results_inlined.txt"
        ];

        const sidenavbarFileNames = [

        ];
  const bestFile = (await pickBestFileWithDeepseek(newSearchQuery, fileNames, DEEPSEEK_API_KEY).catch(e => { console.error(e); return null; }))?.best;
        console.log('Best file for query:', newSearchQuery, 'is', bestFile);
        if (!bestFile) naiveMatch(newSearchQuery, fileNames);

        if (!cancelled) {
          const src = bestFile ? `/scraped_data/${bestFile}` : "";
          // If your state for the path is named differently, replace setSource with it:
          setRaw(src);
        }


      }, 250);

    }
  }, [searchTerm]);




  const customCSS = `
  li.y-css-mhg9c5 { list-style-type: none; display: inline-block; margin-right: 1rem; }
  h3.y-css-hcgwj4{ font-size:0px }
  .y-css-98gs0f{border: 1px solid white; background-color:rgb(220 38 38); color:white;  
  border-radius: 20px; padding: 0.4rem; font-size:0.75rem;
   text-align: left; cursor: pointer; font-weight:600;}
  h3.y-css-hcgwj4 > a { opacity:1; font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0; }
  div.y-css-1wz9c5l { font-size: 0.875rem; color: #555; margin-bottom: 0.5rem; }
  div.hoverable__09f24___UXLO { transition: background-color 0.3s; }
  p.y-css-oyr8zn{ color: #333; font-size: 0.875rem; line-height: 1.25rem; margin-bottom: 0.5rem; width: 80%; text-wrap: break-word; }
  div.tag__09f24___FjcU y-css-mhg9c5 { font-size: 0.75rem; color: red; margin-right: 0.5rem; }
  .mobile-text-medium__09f24__MZ1v6 y-css-dk7k8l { font-size: 0.875rem; color: #333; margin-bottom: 0.5rem; background-color:rgb(80, 10, 10); }
  .ABP.y-css-pwt8yl, .y-css-pwt8yl{ display: flex; gap: 1rem; }
  .y-css-12sjtgu { font-size: 0.875rem; color: #555; margin-bottom: 0.5rem;  display: flex; }
  .y-css-12sjtgu>span { margin-left: 0.5rem; }
  .y-css-12sjtgu > :first-child { margin-left: 0;}
  .y-css-ifzvh4{display:none;}
  .y-css-1y784sg{color:rgb(168, 120, 7) ; font-size:0.75rem; font-weight:600;}
  
  `

  const toggleFavorite = (shopId: string) => {
    setShops(shops.map(shop =>
      shop.id === shopId ? { ...shop, isFavorite: !shop.isFavorite } : shop
    ));
  };

  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-red-500 fill-current' : 'text-gray-300 fill-current'
              }`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
  };

  const PriceLevel = ({ level }: { level: number }) => {
    return (
      <span className="text-gray-600">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={i < level ? 'text-gray-900' : 'text-gray-300'}>
            $
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxHeight: '100vh', overflowY: 'hidden' }}>
      {/* Header */}
      <header className="bg-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">grumble</h1>
              <nav className="hidden md:flex space-x-6">
                <button className="hover:text-red-200">For Business</button>
                <button className="hover:text-red-200">Write a Review</button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="hover:text-red-200">Sign In</button>
              <button className="bg-white text-red-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-red-600 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-2 flex items-center">
            <div className="flex-1 flex items-center border-r">
              <span className="text-gray-500 px-3">Find</span>
              <input
                type="text"
                placeholder="Coffee shops, cold brew, espresso..."
                className="flex-1 px-2 py-2 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="bg-red-600 text-white px-6 py-2 rounded-md ml-2 hover:bg-red-700">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">Filters:</span>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Price:</span>
              {[1, 2, 3, 4].map((price) => (
                <button
                  key={price}
                  onClick={() => setSelectedPrice(selectedPrice === price ? null : price)}
                  className={`px-3 py-1 rounded-full text-sm border ${selectedPrice === price
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                >
                  {'$'.repeat(price)}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Min Rating:</span>
              {[4, 3].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                  className={`px-3 py-1 rounded-full text-sm border ${selectedRating === rating
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                >
                  {rating}+ ⭐
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="grid grid-cols-2 gap-2">

        <div className="flex-1 p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

          {raw ? (
            <div className="border-l border-gray-200 p-4" >
              <div className="mb-4 pb-2 border-b">
                <h3 className="text-lg font-medium">Search Results for "{searchTerm}"</h3>
              </div>
              <div className="mb-4">
                <HtmlSnippets source={raw} navigateToDetails={(product) => {
                  // e.preventDefault();

                  navigate('/yelp_details', { state: { product } });
                  // navigate("/done")
                }}
                  query={searchTerm} setResultsLoaded={setResultsLoaded}
                  customCSSProp={customCSS}
                  selectedFilters={selectedFilter}
                  orientation='list' />
              </div>
            </div>
          ) : searchTerm ? (
            <div className="flex-1 p-8 text-center">
              {/* <div className="mb-4 text-gray-500">
                        <Search size={48} className="mx-auto mb-3 opacity-40" />
                        <p className="text-lg">No matching results found for "{searchQuery}"</p>
                        <p className="text-sm mt-2">Try another search term or browse our products below</p>
                      </div> */}
            </div>
          ) : null}



        </div>
        <div className=" rounded-2xl overflow-hidden shadow-lg">
          <iframe
            className="w-full h-full"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.0862258362896!2d-122.41941528468172!3d37.77492927975998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085809c5b21c1b9%3A0xb6f8a6df356d3e57!2sSan+Francisco%2C+CA!5e0!3m2!1sen!2sus!4v1632895637890!5m2!1sen!2sus"
            allowFullScreen
            loading="lazy"
          ></iframe>
          {/* <Map
            className="w-full h-96" // important: give it a height
            center={[37.7749, -122.4194]}
            zoom={13}
            pins={[
              { lat: 37.7749, lng: -122.4194, popup: "San Francisco" },
              { lat: 37.8199, lng: -122.4783, popup: "Golden Gate Bridge" },
            ]}
          /> */}
        </div>

      </div>


    </div>
  );
}
