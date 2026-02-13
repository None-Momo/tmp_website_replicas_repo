// FilterBar.tsx
import React, { useEffect, useRef, useState } from "react";

export type Filters = {
	stops: ("nonstop" | "1stop" | "2plus")[];
	airlines: string[];
	bagsIncluded: boolean;
	priceMax: number; // USD
	departStart: number; // 0-23
	departEnd: number;   // 0-23
	lowEmissionsOnly: boolean;
	connectingAirports: string[];
	durationMaxHrs: number;
};

export function FilterBar({
	value,
	onChange,
	onOpenAll = () => { },
}: {
	value: Filters;
	onChange: (f: Filters) => void;
	onOpenAll?: () => void;
}) {
	return (
		<div className="sticky top-0 z-10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
			<div className="flex flex-wrap items-center gap-2 border-b border-gray-200 py-3">

				<Dropdown label="Stops">
					<Checkbox
						label="Nonstop"
						checked={value.stops.includes("nonstop")}
						onChange={(c) =>
							onChange({
								...value,
								stops: toggle(value.stops, "nonstop", c),
							})
						}
					/>
					<Checkbox
						label="1 stop"
						checked={value.stops.includes("1stop")}
						onChange={(c) =>
							onChange({ ...value, stops: toggle(value.stops, "1stop", c) })
						}
					/>
					<Checkbox
						label="2+ stops"
						checked={value.stops.includes("2plus")}
						onChange={(c) =>
							onChange({ ...value, stops: toggle(value.stops, "2plus", c) })
						}
					/>
				</Dropdown>

				<Dropdown label="Airlines">
					<TagInput
						placeholder="Add airline (e.g., Delta, AA)"
						values={value.airlines}
						onChange={(airlines) => onChange({ ...value, airlines })}
					/>
				</Dropdown>

				<Dropdown label="Bags">
					<Checkbox
						label="Include carry-on"
						checked={value.bagsIncluded}
						onChange={(bagsIncluded) => onChange({ ...value, bagsIncluded })}
					/>
				</Dropdown>

				<Dropdown label="Price">
					<SliderRow
						label={`Up to $${value.priceMax}`}
						min={50}
						max={2000}
						step={10}
						value={value.priceMax}
						onChange={(priceMax) => onChange({ ...value, priceMax })}
					/>
				</Dropdown>

				<Dropdown label="Emissions">
					<Checkbox
						label="Only lower-emissions options"
						checked={value.lowEmissionsOnly}
						onChange={(lowEmissionsOnly) =>
							onChange({ ...value, lowEmissionsOnly })
						}
					/>
				</Dropdown>

				{/* <Dropdown label="Connecting airports">
					<TagInput
						placeholder="Add airport (e.g., DEN, DFW)"
						values={value.connectingAirports}
						onChange={(connectingAirports) =>
							onChange({ ...value, connectingAirports })
						}
					/>
				</Dropdown> */}

				<Dropdown label="Duration">
					<SliderRow
						label={`Max duration: ${value.durationMaxHrs}h`}
						min={1}
						max={40}
						step={1}
						value={value.durationMaxHrs}
						onChange={(durationMaxHrs) =>
							onChange({ ...value, durationMaxHrs })
						}
					/>
				</Dropdown>
			</div>
		</div>
	);
}

/* ---------- helpers & tiny UI primitives ---------- */

function Dropdown({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (!ref.current) return;
			if (!ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, []);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
			>
				{label}
				<svg
					viewBox="0 0 20 20"
					className="h-[14px] w-[14px] text-gray-500"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M5.25 7.5 10 12.25 14.75 7.5h-9.5Z" />
				</svg>
			</button>
			{open && (
				<div className="absolute left-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
					{children}
					<div className="mt-3 flex justify-end">
						<button
							className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
							onClick={() => setOpen(false)}
						>
							Done
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

function Checkbox({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
			<input
				type="checkbox"
				className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span className="text-sm text-gray-800">{label}</span>
		</label>
	);
}

function SliderRow({
	label,
	value,
	min,
	max,
	step,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
}) {
	return (
		<div>
			<div className="mb-1 text-xs font-medium text-gray-700">{label}</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-full accent-blue-600"
			/>
			<div className="mt-1 text-[11px] text-gray-500">
				{min} — {max}
			</div>
		</div>
	);
}

function TagInput({
	values,
	onChange,
	placeholder,
}: {
	values: string[];
	onChange: (vals: string[]) => void;
	placeholder?: string;
}) {
	const [text, setText] = useState("");
	return (
		<div className="space-y-2">
			<div className="flex flex-wrap gap-1.5">
				{values.map((v) => (
					<span
						key={v}
						className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-2.5 py-1 text-xs"
					>
						{v}
						<button
							className="text-gray-500 hover:text-gray-700"
							onClick={() => onChange(values.filter((x) => x !== v))}
							aria-label={`Remove ${v}`}
						>
							×
						</button>
					</span>
				))}
			</div>
			<div className="flex items-center gap-2">
				<input
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && text.trim()) {
							onChange([...values, text.trim()]);
							setText("");
						}
					}}
					placeholder={placeholder}
					className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm hover:bg-gray-50"
					onClick={() => {
						if (text.trim()) {
							onChange([...values, text.trim()]);
							setText("");
						}
					}}
				>
					Add
				</button>
			</div>
		</div>
	);
}

function toggle<T>(arr: T[], item: T, on: boolean) {
	return on ? [...arr, item] : arr.filter((x) => x !== item);
}
function pad(n: number) {
	return String(n).padStart(2, "0");
}
