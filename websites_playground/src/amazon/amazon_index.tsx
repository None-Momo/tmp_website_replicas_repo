import React, { useState } from 'react';
import { Search, ShoppingCart, Menu, User, MapPin, ChevronDown, Star, Heart } from 'lucide-react';
import { useNavigate } from "react-router";
import { handleDynamicPage } from './dynamic_page';


interface Product {
  id: number;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  prime: boolean;
  discount?: number;
  image?: string;
}

const RiverBuyClone: React.FC = () => {
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');


  let navigate = useNavigate();

  const categories = [
    'All', 'Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports', 'Toys & Games', 'Beauty', 'Automotive'
  ];

  const products: Product[] = [
    { id: 1, title: 'Wireless Bluetooth Headphones with Noise Cancelling', price: 89.99, rating: 4.5, reviews: 2847, prime: true, discount: 20, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 2, title: 'Smart Watch with Heart Rate Monitor', price: 199.99, rating: 4.3, reviews: 1523, prime: true, image: "https://images.unsplash.com/photo-1532288744908-b37abee2ed71?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 3, title: 'Portable Charger 20000mAh Power Bank', price: 29.99, rating: 4.6, reviews: 5621, prime: true, discount: 35, image: "https://plus.unsplash.com/premium_photo-1715115406713-fd67ecea8dcc?q=80&w=786&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 4, title: 'Ergonomic Office Chair with Lumbar Support', price: 249.99, rating: 4.2, reviews: 892, prime: false, image: "https://images.unsplash.com/photo-1688578735352-9a6f2ac3b70a?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 5, title: 'Stainless Steel Water Bottle 32oz', price: 24.99, rating: 4.7, reviews: 3421, prime: true },
    { id: 6, title: '4K Webcam for Streaming and Video Calls', price: 79.99, rating: 4.4, reviews: 1876, prime: true, discount: 15 },
    { id: 7, title: 'Yoga Mat Non-Slip Exercise Mat', price: 19.99, rating: 4.5, reviews: 4231, prime: true },
    { id: 8, title: 'LED Desk Lamp with USB Charging Port', price: 39.99, rating: 4.3, reviews: 2109, prime: false, discount: 25 },
  ];

  const addToCart = () => {
    setCartCount(prev => prev + 1);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="amazon-header bg-gray-900">
        <div className="flex items-center px-4 py-2">
          {/* Logo */}
          <div className="flex items-center mr-4">
            <span className="text-white text-2xl font-bold">RiverBuy</span>
            <span className="text-orange-400 text-sm ml-1">.com</span>
          </div>

          {/* Deliver to */}
          <div className="hidden md:flex items-center text-white ml-4 cursor-pointer hover:border hover:border-white p-2">
            <MapPin className="w-5 h-5 mr-1" />
            <div className="text-xs">
              <div className="text-gray-400">Deliver to</div>
              <div className="font-bold">New York 10001</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 flex mx-4">
            <select
              className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-l border-r border-gray-300"
              value={selectedCategory}
              onChange={(e: { target: { value: any; }; }) => {
                console.log('Category changed:', e.target.value);

                setSelectedCategory(e.target.value)

              }
              }
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              className="flex-1 px-3 py-2 text-gray-900"
              placeholder="Search RiverBuy"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
              }}
              //onKeydown check for Enter key to trigger search
              onKeyDown={(e) => {
                if (e.key === 'Enter') {

                  //TODO: add a loading delay before navigating
                  navigate(`/RiverBuy_search?query=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`);
                }
              }}


            />
            <button className="bg-orange-400 px-4 rounded-r hover:bg-orange-500"

              onClick={(e) => {
                e.preventDefault();
                navigate(`/RiverBuy_search?query=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`);
              }}>
              <Search className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Account & Lists */}
          <div className="hidden md:flex items-center text-white mx-3 cursor-pointer hover:border hover:border-white p-2">
            <div className="text-xs">
              <div>Hello, Sign in</div>
              <div className="font-bold flex items-center">
                Account & Lists <ChevronDown className="w-3 h-3 ml-1" />
              </div>
            </div>
          </div>

          {/* Returns & Orders */}
          <div className="hidden md:flex items-center text-white mx-3 cursor-pointer hover:border hover:border-white p-2">
            <div className="text-xs">
              <div>Returns</div>
              <div className="font-bold">& Orders</div>
            </div>
          </div>

          {/* Cart */}
          <div className="flex items-center text-white mx-3 cursor-pointer hover:border hover:border-white p-2">
            <div className="relative">
              <ShoppingCart className="w-8 h-8" />
              <span className="absolute -top-2 -right-2 bg-orange-400 text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span className="font-bold ml-1 hidden md:inline">Cart</span>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="bg-gray-800 text-white px-4 py-2 flex items-center space-x-6 text-sm">
          <div className="flex items-center cursor-pointer hover:border hover:border-white p-1">
            <Menu className="w-5 h-5 mr-1" />
            <span>All</span>
          </div>
          <span className="cursor-pointer hover:border hover:border-white p-1">Today's Deals</span>
          <span className="cursor-pointer hover:border hover:border-white p-1">Customer Service</span>
          <span className="cursor-pointer hover:border hover:border-white p-1">Registry</span>
          <span className="cursor-pointer hover:border hover:border-white p-1"
            onClick={() => {
              handleDynamicPage('Gift Cards', navigate);
            }}>Gift Cards</span>
          <span className="cursor-pointer hover:border hover:border-white p-1">Sell</span>
        </nav>
      </header>

      {/* Hero Banner */}
      <div className="relative">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-64 flex items-center justify-center">
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold mb-2">Holiday Deals</h1>
            <p className="text-xl">Save up to 50% on select items</p>
            <button className="mt-4 bg-orange-400 text-gray-900 px-6 py-2 rounded font-semibold hover:bg-orange-500">
              Shop Now
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Featured Categories */}
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {['Electronics', 'Fashion', 'Home', 'Books'].map((category) => (
            <div key={category} className="bg-white p-4 rounded shadow hover:shadow-lg cursor-pointer">
              <h3 className="font-bold text-lg mb-2">{category}</h3>
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-32 mb-2" />
              <span className="text-blue-600 text-sm hover:text-orange-500">Shop now</span>
            </div>
          ))}
        </div> */}

        {/* Products Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Best Sellers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white p-4 rounded shadow hover:shadow-lg">
                <div className="relative">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-48 mb-3" >
                    {/* Placeholder for product image */}
                    <img
                      src={product.image || 'https://via.placeholder.com/150'}
                      alt={product.title}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  {product.discount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      {product.discount}% OFF
                    </span>
                  )}
                  <button className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:shadow-md">
                    {/* <Heart className="w-4 h-4 text-gray-600" /> */}
                  </button>
                </div>
                <h3 className="text-sm font-medium mb-1 line-clamp-2 hover:text-orange-500 cursor-pointer">
                  {product.title}
                </h3>
                <div className="flex items-center mb-1">
                  <div className="flex mr-1">{renderStars(product.rating)}</div>
                  <span className="text-xs text-gray-600">({product.reviews.toLocaleString()})</span>
                </div>
                {product.prime && (
                  <div className="text-xs font-bold text-blue-600 mb-1">prime</div>
                )}
                <div className="flex items-baseline mb-2">
                  <span className="text-xl font-bold">${product.price}</span>
                  {product.discount && (
                    <span className="text-sm text-gray-500 line-through ml-2">
                      ${(product.price * (1 + product.discount / 100)).toFixed(2)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    navigate('/done')
                  }}
                  className="w-full bg-yellow-400 text-gray-900 py-1 px-3 rounded text-sm font-medium hover:bg-yellow-500"


                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Deals of the Day */}
        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-2xl font-bold mb-4">Deals of the Day</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.slice(0, 3).map((product) => (
              <div key={product.id} className="flex space-x-4">
                {/* <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 flex-shrink-0" /> */}
                <div>
                  <h3 className="font-medium text-sm mb-1">{product.title}</h3>
                  <div className="text-red-600 font-bold">${product.price}</div>
                  <button className="text-blue-600 text-sm hover:text-orange-500 mt-1">See all deals</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="bg-gray-700 py-3 text-center cursor-pointer hover:bg-gray-600">
          <p className="text-sm">Back to top</p>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold mb-3">Get to Know Us</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="hover:text-white cursor-pointer">Careers</li>
              <li className="hover:text-white cursor-pointer">Blog</li>
              <li className="hover:text-white cursor-pointer">About RiverBuy</li>
              <li className="hover:text-white cursor-pointer">Investor Relations</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-3">Make Money with Us</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="hover:text-white cursor-pointer">Sell on RiverBuy</li>
              <li className="hover:text-white cursor-pointer">Sell under RiverBuy Accelerator</li>
              <li className="hover:text-white cursor-pointer">RiverBuy Global Selling</li>
              <li className="hover:text-white cursor-pointer">Become an Affiliate</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-3">RiverBuy Payment Products</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="hover:text-white cursor-pointer">RiverBuy Business Card</li>
              <li className="hover:text-white cursor-pointer">Shop with Points</li>
              <li className="hover:text-white cursor-pointer">Reload Your Balance</li>
              <li className="hover:text-white cursor-pointer">RiverBuy Currency Converter</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-3">Let Us Help You</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="hover:text-white cursor-pointer">Your Account</li>
              <li className="hover:text-white cursor-pointer">Your Orders</li>
              <li className="hover:text-white cursor-pointer">Shipping Rates & Policies</li>
              <li className="hover:text-white cursor-pointer">Help</li>
            </ul>
          </div>
        </div>
        <div className="bg-gray-900 py-4 text-center text-xs text-gray-400">
          <p>© 2024 RiverBuy Clone. This is a demo website for educational purposes only.</p>
        </div>
      </footer>
    </div>
  );
};

export default RiverBuyClone;