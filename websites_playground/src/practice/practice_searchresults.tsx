import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PracticeSearchForm } from './practice_index';
import { searchPracticeBooks } from './practice_data';

const PracticeSearchResults: React.FC = () => {
	const [params] = useSearchParams();
	const query = params.get('q') ?? '';
	const results = searchPracticeBooks(query);
	const count = results.length;

	return (
		<div className="max-w-3xl mx-auto p-6">
			<p className="mb-4"><Link to="/practice" className="text-blue-800 underline">Practice Library</Link></p>
			<h1 className="text-3xl font-bold mb-4">Search results</h1>
			<PracticeSearchForm initialQuery={query} />
			<p role="status" className="my-4">
				{count === 1 ? '1 search result found.' : `${count} search results found.`}
			</p>
			<ol className="list-none p-0 space-y-4">
				{results.map((book) => (
					<li key={book.slug}>
						<article className="border border-gray-400 rounded p-4">
							<h2 className="text-xl font-bold mb-2">{book.title}</h2>
							<p>Author: {book.author}</p>
							<p className="mb-3">Status: {book.status}</p>
							<Link
								to={`/practice_details/${book.slug}`}
								aria-label={`View details for ${book.title}`}
								className="inline-block bg-blue-800 text-white font-semibold rounded px-4 py-2"
							>
								View details
							</Link>
						</article>
					</li>
				))}
			</ol>
		</div>
	);
};

export default PracticeSearchResults;
