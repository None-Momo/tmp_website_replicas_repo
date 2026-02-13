import React, { useState } from 'react';
import { Search, Star, ChevronDown, MapPin, Utensils, Coffee, ShoppingBag, Wrench, Home, Heart, Car, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function YelpClone() {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navigate = useNavigate();

  const categories = [
    { name: 'Restaurants', icon: Utensils, color: 'bg-red-500' },
    { name: 'Shopping', icon: ShoppingBag, color: 'bg-blue-500' },
    { name: 'Nightlife', icon: Sparkles, color: 'bg-purple-500' },
    { name: 'Active Life', icon: Heart, color: 'bg-green-500' },
    { name: 'Services', icon: Wrench, color: 'bg-yellow-500' },
    { name: 'Home Services', icon: Home, color: 'bg-indigo-500' },
    { name: 'Auto Services', icon: Car, color: 'bg-gray-600' },
    { name: 'Coffee & Tea', icon: Coffee, color: 'bg-orange-500' },
  ];

  const featuredBusinesses = [
    {
      name: 'The Modern Restaurant',
      category: 'American (New)',
      rating: 4.5,
      reviews: 324,
      price: '$$',
      image: 'restaurant',
      trending: true
    },
    {
      name: 'Sunrise Coffee House',
      category: 'Coffee & Tea',
      rating: 4.8,
      reviews: 189,
      price: '$',
      image: 'coffee',
      trending: false
    },
    {
      name: 'Elite Auto Care',
      category: 'Auto Repair',
      rating: 5.0,
      reviews: 567,
      price: '$$',
      image: 'auto',
      trending: true
    },
    {
      name: 'Garden Bistro',
      category: 'Italian',
      rating: 4.3,
      reviews: 445,
      price: '$$$',
      image: 'bistro',
      trending: false
    }
  ];

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < Math.floor(rating)
              ? 'fill-red-500 text-red-500'
              : i < rating
                ? 'fill-red-200 text-red-500'
                : 'fill-gray-200 text-gray-400'
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-red-600 text-white font-black text-2xl px-3 py-1 rounded">grumble</div>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <button className="text-gray-700 hover:text-gray-900 font-medium">grumble for Business</button>
              <button className="text-gray-700 hover:text-gray-900 font-medium">Write a Review</button>
              <button className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Log In</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium">Sign Up</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-red-600 to-red-800 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-8">Find the best local businesses</h1>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-xl p-2 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center border-r border-gray-200 px-4">
                  <Search className="text-gray-400 w-5 h-5 mr-3" />
                  <input
                    type="text"
                    placeholder="tacos, cheap dinner, Max's"
                    className="w-full py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}

                    // onKeyDown event to handle enter key
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        //check if search term or location is empty
                        if (!searchTerm) {
                          alert('Please enter a search term or location');
                          return;
                        }
                        //redirect to search results page with query params
                        const queryParams = new URLSearchParams();
                        if (searchTerm) queryParams.append('query', searchTerm);
                        navigate(`/grumble_search?${queryParams.toString()}`);
                      }
                    }}
                  />
                </div>
                {/* <div className="flex-1 flex items-center px-4">
                  <MapPin className="text-gray-400 w-5 h-5 mr-3" />
                  <input
                    type="text"
                    placeholder="San Francisco, CA"
                    className="w-full py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div> */}
                <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-medium transition-colors"
                  onClick={() => {
                    //check if search term or location is empty
                    if (!searchTerm) {
                      alert('Please enter a search term or location');
                      return;
                    }
                    //redirect to search results page with query params
                    const queryParams = new URLSearchParams();
                    if (searchTerm) queryParams.append('query', searchTerm);
                    navigate(`/grumble_search?${queryParams.toString()}`);

                  }}>
                  Search

                </button>
              </div>
            </div>

          </div>
        </div>
      </div>


    </div>
  );
}
