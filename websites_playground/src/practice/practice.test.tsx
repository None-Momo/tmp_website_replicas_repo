import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PracticeLibrary from './practice_index';
import PracticeSearchResults from './practice_searchresults';
import { PracticeDetails } from './practice_details';

const renderApp = () =>
	render(
		<MemoryRouter initialEntries={['/practice']}>
			<Routes>
				<Route path="/practice" element={<PracticeLibrary />} />
				<Route path="/practice_search" element={<PracticeSearchResults />} />
				<Route path="/practice_details/:slug" element={<PracticeDetails />} />
			</Routes>
		</MemoryRouter>
	);

test('search with Enter, see three results, open The Quiet Garden details', () => {
	renderApp();
	expect(screen.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeInTheDocument();

	userEvent.type(screen.getByLabelText('Search books'), 'The Quiet Garden{enter}');

	expect(screen.getByRole('status')).toHaveTextContent('3 search results found.');
	expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
		'The Quiet Garden',
		'Quiet Gardens of Europe',
		'Garden Sounds',
	]);
	expect(screen.getAllByRole('link', { name: /^View details for/ })).toHaveLength(3);

	userEvent.click(screen.getByRole('link', { name: 'View details for The Quiet Garden' }));

	expect(screen.getByRole('heading', { level: 1, name: 'The Quiet Garden' })).toBeInTheDocument();
	for (const text of ['Maya Chen', 'Paperback', 'Available', 'FIC CHE']) {
		expect(screen.getByText(text)).toBeInTheDocument();
	}
});

test('Search button submits the search', () => {
	renderApp();
	userEvent.type(screen.getByLabelText('Search books'), 'The Quiet Garden');
	userEvent.click(screen.getByRole('button', { name: 'Search' }));
	expect(screen.getByRole('status')).toHaveTextContent('3 search results found.');
});

test('The Quiet Garden details page has no actionable controls', () => {
	renderApp();
	userEvent.type(screen.getByLabelText('Search books'), 'The Quiet Garden{enter}');
	userEvent.click(screen.getByRole('link', { name: 'View details for The Quiet Garden' }));
	expect(screen.queryByRole('link')).not.toBeInTheDocument();
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	expect(screen.queryByText('Back to Practice Library')).not.toBeInTheDocument();
});
