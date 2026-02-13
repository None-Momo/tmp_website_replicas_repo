import React, { useState, useEffect } from 'react';
import { Search, MapPin, ShoppingCart, Menu, ChevronDown, Star, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import HtmlSnippets from './htlmSnippersAmazon';
import { useLocation, useNavigate } from 'react-router-dom';
import { extractProductFromHtml, ParsedProduct } from './extractAmazonProductDetail';
import { set } from 'date-fns';

interface Product {
	id: number;
	title: string;
	price: number;
	originalPrice?: number;
	rating: number;
	reviews: number;
	prime: boolean;
	freeShipping: boolean;
	brand: string;
	category: string;
	bestSeller?: boolean;
	amazonChoice?: boolean;
}


export default function RiverBuyProductDetail() {

	// State
	const [selectedImage, setSelectedImage] = useState(0);
	const [quantity, setQuantity] = useState(1);

	// Handlers
	const handleAddToCart = () => {
		setCartCount(prev => prev + quantity);
		alert(`Task Done: Added ${quantity} item(s) to cart`);

		navigate('/done');
	};

	const handleBuyNow = () => {
		alert(`Task Done: Proceeding to checkout with ${quantity} item(s)`);

		navigate('/done');
	};

	const incrementQuantity = () => {
		setQuantity(prev => Math.min(prev + 1, 10));
	};

	const decrementQuantity = () => {
		setQuantity(prev => Math.max(prev - 1, 1));
	};






	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('All');
	const [cartCount, setCartCount] = useState(0);
	const [selectedProduct, setSelectedProduct] = useState<ParsedProduct | null>(null);

	const navigate = useNavigate();
	const location = useLocation();

	const categories = ['All', 'Electronics', 'Computers', 'Smart Home', 'Arts & Crafts', 'Automotive', 'Baby', 'Beauty', 'Books', 'Fashion', 'Food', 'Health', 'Home', 'Sports', 'Toys'];


	// Get productId from location state
	const { product } = location.state as { product: string };
	useEffect(() => {
		setSelectedProduct(extractProductFromHtml(product));
	}, [location.state]);

	// console.log('Product ID from state:', extractProductFromHtml(product));



	return (
		<div className="min-h-screen bg-white">
			{/* Header */}
			<header className="bg-slate-900">
				<div className="flex items-center px-4 py-2">
					{/* Logo */}
					<div className="flex items-center mr-4">
						<div className="text-white font-bold text-2xl px-2">RiverBuy</div>
					</div>

					{/* Deliver to */}
					<div className="flex items-center text-white mr-4 cursor-pointer hover:border hover:border-white p-1">
						<MapPin size={20} />
						<div className="ml-1">
							<div className="text-xs text-gray-300">Deliver to</div>
							<div className="text-sm font-bold">New York 10001</div>
						</div>
					</div>

					{/* Search Bar */}
					<div className="flex-1 flex">
						<select
							className="px-2 py-2 bg-gray-100 text-gray-700 text-sm rounded-l border-r border-gray-300 hover:bg-gray-200 cursor-pointer"
							value={selectedCategory}
							onChange={(e) => {
								setSelectedCategory(e.target.value)
							}}
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
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						<button className="bg-orange-400 px-4 rounded-r hover:bg-orange-500">
							<Search className="text-slate-900" size={22} />
						</button>
					</div>

					{/* Account */}
					<div className="flex items-center ml-4 text-white cursor-pointer hover:border hover:border-white p-1">
						<div>
							<div className="text-xs">Hello, sign in</div>
							<div className="text-sm font-bold flex items-center">
								Account & Lists <ChevronDown size={14} className="ml-1" />
							</div>
						</div>
					</div>

					{/* Returns */}
					<div className="ml-4 text-white cursor-pointer hover:border hover:border-white p-1">
						<div className="text-xs">Returns</div>
						<div className="text-sm font-bold">& Orders</div>
					</div>

					{/* Cart */}
					<div className="ml-4 flex items-center text-white cursor-pointer hover:border hover:border-white p-1">
						<div className="relative">
							<ShoppingCart size={32} />
							<span className="absolute -top-1 -right-1 bg-orange-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
								{cartCount}
							</span>
						</div>
						<span className="ml-1 font-bold">Cart</span>
					</div>
				</div>

				{/* Secondary Nav */}
				<div className="bg-slate-800 text-white flex items-center px-4 py-2 text-sm">
					<div className="flex items-center cursor-pointer hover:border hover:border-white p-1 mr-4">
						<Menu size={20} className="mr-1" />
						<span className="font-bold">All</span>
					</div>
					<div className="flex space-x-4">
						{['Today\'s Deals', 'Customer Service', 'Registry', 'Gift Cards', 'Sell'].map(item => (
							<span key={item} className="cursor-pointer hover:border hover:border-white p-1">{item}</span>
						))}
					</div>
				</div>
			</header>

			{/* Main Content */}
			<div className="flex">


				{/* Raw HTML Content Display */}
				<div className="flex-1 p-4">
					{/* <HtmlSnippets renderMode="detail" source={product} /> */}
					<div className="min-h-screen bg-gray-100 py-8">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
							<div className="bg-white rounded-lg shadow-md overflow-hidden">
								{/* Breadcrumb */}
								{/* <div className="px-6 py-3 text-sm text-gray-500 border-b">
									<span>Electronics › Headphones › Wireless Headphones</span>
								</div> */}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
									{/* Product Images */}
									<div className="flex flex-col">
										<div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center mb-4 h-96">
											<div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
												{/* <span className="text-gray-500">Product Image {selectedImage + 1}</span> */}
												<img
													src={selectedProduct?.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image'}
													// alt={fakeProduct.images[selectedImage].alt}
													className="max-h-full max-w-full object-contain"
												/>
											</div>
										</div>
									</div>

									{/* Product Details */}
									<div>
										<h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct?.name}</h1>

										{/* {renderRating()} */}

										<div className="my-4">
											<div className="flex items-baseline">
												<span className="text-3xl font-bold text-gray-900">{selectedProduct?.priceText}</span>
											</div>
										</div>

										<div className="border-t border-b py-4 my-4">
											<h3 className="font-semibold text-gray-900 mb-2">About this item</h3>
											<p className="text-gray-700 mb-3">{selectedProduct?.name}</p>


										</div>

										<div className="flex items-center mb-6">
											<span className="mr-3 font-medium">Quantity:</span>
											<div className="flex items-center border rounded">
												<button
													onClick={decrementQuantity}
													className="px-3 py-1 text-gray-600 hover:bg-gray-100"
												>
													-
												</button>
												<span className="px-3 py-1">{quantity}</span>
												<button
													onClick={incrementQuantity}
													className="px-3 py-1 text-gray-600 hover:bg-gray-100"
												>
													+
												</button>
											</div>
										</div>

										<div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
											<button
												onClick={handleAddToCart}
												className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-3 px-4 rounded-lg shadow hover:shadow-md transition duration-200 flex items-center justify-center"
											>
												Add to Cart
											</button>

											<button
												onClick={handleBuyNow}
												className="flex-1 bg-orange-400 hover:bg-orange-500 text-white font-medium py-3 px-4 rounded-lg shadow hover:shadow-md transition duration-200 flex items-center justify-center"
											>
												Buy Now
											</button>
										</div>

										<div className="mt-6 text-sm text-gray-600">
											<p>Ships from and sold by Amazon</p>
											<p className="mt-1">FREE delivery: Tuesday, June 4</p>
										</div>
									</div>
								</div>
							</div>

							{/* Cart Summary */}
							<div className="mt-6 bg-white rounded-lg shadow-md p-6">
								<h2 className="text-xl font-bold text-gray-900 mb-4">Your Cart</h2>
								<div className="flex justify-between items-center">
									<p className="text-gray-700">
										{cartCount > 0
											? `You have ${cartCount} item(s) in your cart`
											: "Your cart is empty"}
									</p>
									<button className="text-blue-600 hover:text-blue-800 font-medium">
										{cartCount > 0 ? "View Cart" : "Continue Shopping"}
									</button>
								</div>
							</div>
						</div>
					</div>




				</div>




				{/* </div> */}
			</div>

			{/* Footer */}
			<footer className="bg-slate-800 text-white mt-12">
				<div className="text-center py-4 bg-slate-700 cursor-pointer hover:bg-slate-600">
					<span className="text-sm">Back to top</span>
				</div>
				<div className="px-8 py-8 grid grid-cols-4 gap-8">
					<div>
						<h4 className="font-bold mb-2">Get to Know Us</h4>
						<div className="space-y-1 text-sm text-gray-300">
							<div className="cursor-pointer hover:underline">Careers</div>
							<div className="cursor-pointer hover:underline">Blog</div>
							<div className="cursor-pointer hover:underline">About RiverBuy</div>
							<div className="cursor-pointer hover:underline">Investor Relations</div>
						</div>
					</div>
					<div>
						<h4 className="font-bold mb-2">Make Money with Us</h4>
						<div className="space-y-1 text-sm text-gray-300">
							<div className="cursor-pointer hover:underline">Sell products on RiverBuy</div>
							<div className="cursor-pointer hover:underline">Sell on RiverBuy Business</div>
							<div className="cursor-pointer hover:underline">Sell apps on RiverBuy</div>
							<div className="cursor-pointer hover:underline">Become an Affiliate</div>
						</div>
					</div>
					<div>
						<h4 className="font-bold mb-2">RiverBuy Payment Products</h4>
						<div className="space-y-1 text-sm text-gray-300">
							<div className="cursor-pointer hover:underline">RiverBuy Business Card</div>
							<div className="cursor-pointer hover:underline">Shop with Points</div>
							<div className="cursor-pointer hover:underline">Reload Your Balance</div>
							<div className="cursor-pointer hover:underline">RiverBuy Currency Converter</div>
						</div>
					</div>
					<div>
						<h4 className="font-bold mb-2">Let Us Help You</h4>
						<div className="space-y-1 text-sm text-gray-300">
							<div className="cursor-pointer hover:underline">RiverBuy and COVID-19</div>
							<div className="cursor-pointer hover:underline">Your Account</div>
							<div className="cursor-pointer hover:underline">Your Orders</div>
							<div className="cursor-pointer hover:underline">Shipping Rates & Policies</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
