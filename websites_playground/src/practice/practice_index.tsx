import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const PracticeSearchForm: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
	const navigate = useNavigate();
	const [query, setQuery] = useState(initialQuery);

	// A native <form> makes Enter and the Search button do the same thing.
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		navigate(`/practice_search?q=${encodeURIComponent(query.trim())}`);
	};

	return (
		<form role="search" onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
			<div className="flex flex-col">
				<label htmlFor="practice-search-input" className="font-semibold mb-1">Search books</label>
				<input
					id="practice-search-input"
					name="q"
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					autoComplete="off"
					className="border border-gray-600 rounded px-3 py-2 w-72"
				/>
			</div>
			<button type="submit" className="bg-blue-800 text-white font-semibold rounded px-5 py-2">Search</button>
		</form>
	);
};

const PracticeLibrary: React.FC = () => (
	<div className="max-w-3xl mx-auto p-6">
		<h1 className="text-3xl font-bold mb-2">Practice Library</h1>
		<p className="mb-6">Search the library catalog.</p>
		<PracticeSearchForm />
	</div>
);

export default PracticeLibrary;
