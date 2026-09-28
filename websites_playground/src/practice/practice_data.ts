export interface PracticeBook {
	slug: string;
	title: string;
	author: string;
	status: 'Available' | 'Checked out';
	format: string;
	callNumber: string;
}

// Fixed catalog in fixed order: no randomness, no network requests.
export const PRACTICE_BOOKS: PracticeBook[] = [
	{ slug: 'the-quiet-garden', title: 'The Quiet Garden', author: 'Maya Chen', status: 'Available', format: 'Paperback', callNumber: 'FIC CHE' },
	{ slug: 'quiet-gardens-of-europe', title: 'Quiet Gardens of Europe', author: 'Daniel Ruiz', status: 'Available', format: 'Hardcover', callNumber: '712 RUI' },
	{ slug: 'garden-sounds', title: 'Garden Sounds', author: 'Priya Shah', status: 'Checked out', format: 'Paperback', callNumber: '577 SHA' },
];

const STOP_WORDS = new Set(['the', 'a', 'an', 'of']);

export function searchPracticeBooks(query: string): PracticeBook[] {
	const tokens = query
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t && !STOP_WORDS.has(t));
	if (tokens.length === 0) return [];
	return PRACTICE_BOOKS.filter((book) => {
		const haystack = `${book.title} ${book.author}`.toLowerCase();
		return tokens.some((t) => haystack.includes(t));
	});
}

export function findPracticeBook(slug?: string): PracticeBook | undefined {
	return PRACTICE_BOOKS.find((b) => b.slug === slug);
}
