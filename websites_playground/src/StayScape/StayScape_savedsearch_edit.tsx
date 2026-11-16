import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
	SavedSearchFormErrors,
	SavedSearchFormValues,
	StayScapeSavedSearch,
	findSavedSearch,
	toFormValues,
	updateSavedSearch,
	validateSavedSearchForm,
} from './StayScape_savedsearch_data';
import {
	PRIMARY_ACTION_CLASS,
	SECONDARY_ACTION_CLASS,
	SavedSearchNotFound,
	StayScapeSavedSearchPage,
	savedSearchPath,
	useFocusOnMount,
} from './StayScape_savedsearches';

type FieldKey = keyof SavedSearchFormValues;

const FIELD_IDS: Record<FieldKey, string> = {
	name: 'saved-search-name',
	destination: 'saved-search-destination',
	checkIn: 'saved-search-check-in',
	checkOut: 'saved-search-check-out',
	maxBudget: 'saved-search-max-budget',
};

/** Form order; also the order problems are listed in the summary. */
const FIELD_ORDER: FieldKey[] = ['name', 'destination', 'checkIn', 'checkOut', 'maxBudget'];

interface FieldProps {
	fieldKey: FieldKey;
	label: string;
	type: 'text' | 'date' | 'number';
	value: string;
	error?: string;
	hint?: string;
	onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

// A labelled native input. The hint and the error are tied to the input with
// aria-describedby; the error is also marked with aria-invalid and a visually
// hidden "Error:" prefix so it does not rely on colour.
const Field: React.FC<FieldProps> = ({ fieldKey, label, type, value, error, hint, onChange, inputProps }) => {
	const id = FIELD_IDS[fieldKey];
	const hintId = hint ? `${id}-hint` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
	return (
		<div className="mb-5">
			<label htmlFor={id} className="block font-semibold text-gray-900 mb-1">{label}</label>
			{hint && <p id={hintId} className="text-sm text-gray-600 mb-1">{hint}</p>}
			{error && (
				<p id={errorId} className="text-red-700 mb-1">
					<span className="sr-only">Error: </span>{error}
				</p>
			)}
			<input
				id={id}
				name={fieldKey}
				type={type}
				value={value}
				onChange={onChange}
				aria-invalid={error ? true : undefined}
				aria-describedby={describedBy}
				className={`block w-full max-w-md rounded-lg px-3 py-2 text-gray-900 bg-white border ${error ? 'border-red-600' : 'border-gray-400'}`}
				{...inputProps}
			/>
		</div>
	);
};

const SavedSearchEditForm: React.FC<{ search: StayScapeSavedSearch }> = ({ search }) => {
	const navigate = useNavigate();
	const [values, setValues] = useState<SavedSearchFormValues>(() => toFormValues(search));
	const [errors, setErrors] = useState<SavedSearchFormErrors>({});
	const [saveError, setSaveError] = useState('');
	const [submitCount, setSubmitCount] = useState(0);
	const headingRef = useFocusOnMount<HTMLHeadingElement>();
	const summaryRef = useRef<HTMLDivElement>(null);

	const problems = FIELD_ORDER.filter((key) => errors[key]).map((key) => ({ key, message: errors[key] as string }));
	const hasProblems = problems.length > 0 || saveError !== '';

	// After every failed submit, move focus to the problem summary so keyboard
	// and screen reader users hear what went wrong and can jump to the field.
	useEffect(() => {
		if (submitCount > 0 && hasProblems) summaryRef.current?.focus();
	}, [submitCount, hasProblems]);

	const setField = (key: FieldKey) => (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setValues((previous) => ({ ...previous, [key]: value }));
	};

	const focusField = (key: FieldKey) => (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		document.getElementById(FIELD_IDS[key])?.focus();
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const { errors: nextErrors, changes } = validateSavedSearchForm(values);
		setErrors(nextErrors);
		setSubmitCount((count) => count + 1);
		if (!changes) {
			setSaveError('');
			return;
		}
		const result = updateSavedSearch(search.id, changes);
		if (!result.ok) {
			setSaveError(
				result.reason === 'not-found'
					? 'This saved search no longer exists, so the changes were not saved.'
					: 'The changes could not be saved because browser storage is unavailable. Check the browser settings and try again.'
			);
			return;
		}
		// Only a successful write reaches the details page with a confirmation.
		navigate(savedSearchPath(search.id), {
			state: { statusMessage: `Changes to ${result.record.name} were saved.` },
		});
	};

	return (
		<StayScapeSavedSearchPage current="saved">
			<p className="text-sm uppercase tracking-wide text-gray-600 mb-1">Saved search</p>
			<h1 id="saved-search-edit-heading" ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-2">
				Edit {search.name}
			</h1>
			<p className="text-gray-600 mb-6">
				Change any of the conditions below, then choose Save changes. Choose Cancel editing to leave the saved search as it is.
			</p>

			{hasProblems && (
				<div
					ref={summaryRef}
					tabIndex={-1}
					role="alert"
					className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900"
				>
					<h2 className="text-lg font-semibold mb-2">{saveError ? 'The changes were not saved' : 'There is a problem'}</h2>
					{saveError ? (
						<p>{saveError}</p>
					) : (
						<ul className="list-disc pl-5 space-y-1">
							{problems.map((problem) => (
								<li key={problem.key}>
									<a href={`#${FIELD_IDS[problem.key]}`} onClick={focusField(problem.key)} className="underline">
										{problem.message}
									</a>
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			<form onSubmit={handleSubmit} noValidate aria-labelledby="saved-search-edit-heading" className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
				<Field fieldKey="name" label="Search name" type="text" value={values.name} error={errors.name} onChange={setField('name')} inputProps={{ autoComplete: 'off' }} />
				<Field fieldKey="destination" label="Destination" type="text" value={values.destination} error={errors.destination} onChange={setField('destination')} inputProps={{ autoComplete: 'off' }} />
				<Field fieldKey="checkIn" label="Check-in date" type="date" value={values.checkIn} error={errors.checkIn} onChange={setField('checkIn')} />
				<Field fieldKey="checkOut" label="Check-out date" type="date" value={values.checkOut} error={errors.checkOut} onChange={setField('checkOut')} />
				<Field
					fieldKey="maxBudget"
					label="Maximum budget"
					type="number"
					value={values.maxBudget}
					error={errors.maxBudget}
					hint="Whole US dollars (USD)."
					onChange={setField('maxBudget')}
					inputProps={{ min: 1, step: 1, inputMode: 'numeric' }}
				/>
				<div className="flex flex-wrap gap-3 mt-2">
					<button type="submit" className={PRIMARY_ACTION_CLASS}>Save changes</button>
					<Link to={savedSearchPath(search.id)} className={SECONDARY_ACTION_CLASS}>Cancel editing</Link>
				</div>
			</form>
		</StayScapeSavedSearchPage>
	);
};

/** /stayscape_saved/:id/edit: edit every condition of one saved search. */
export const StayScapeSavedSearchEdit: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const [search] = useState(() => findSavedSearch(id));
	return search ? <SavedSearchEditForm search={search} /> : <SavedSearchNotFound />;
};
