import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { findPracticeBook } from './practice_data';

export const PracticeDetails: React.FC = () => {
	const { slug } = useParams();
	const book = findPracticeBook(slug);

	if (!book) {
		return (
			<div className="max-w-3xl mx-auto p-6">
				<h1 className="text-3xl font-bold mb-4">Book not found</h1>
				<Link to="/practice" className="text-blue-800 underline">Back to Practice Library</Link>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-4">{book.title}</h1>
			<dl className="space-y-2">
				<div><dt className="inline font-semibold">Title: </dt><dd className="inline">{book.title}</dd></div>
				<div><dt className="inline font-semibold">Author: </dt><dd className="inline">{book.author}</dd></div>
				<div><dt className="inline font-semibold">Format: </dt><dd className="inline">{book.format}</dd></div>
				<div><dt className="inline font-semibold">Status: </dt><dd className="inline">{book.status}</dd></div>
				<div><dt className="inline font-semibold">Call number: </dt><dd className="inline">{book.callNumber}</dd></div>
			</dl>
		</div>
	);
};
