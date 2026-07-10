import React, { useEffect, useMemo, useState } from "react";
import "./sidebar.css";

type SidebarGroup = {
	header: string;
	items: string[];
};

type SidebarProps = {
	/** Path to the text file (e.g. "/data/amazon_headphones_sidebar.txt"). */
	filePath: string;
	selectedFilter?: Array<string>;
	setSelectedFilter?: React.Dispatch<React.SetStateAction<Array<string>>>;
	onChange?: (selection: Record<string, boolean>) => void;
	onSeeMore?: (groupHeader: string) => void;
};

const slug = (s: string) =>
	s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const parseSidebar = (text: string): SidebarGroup[] => {
	const blocks = text
		.trim()
		.split(/\n\s*\n/g)
		.map((b) =>
			b
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean)
		)
		.filter((arr) => arr.length > 0);

	return blocks.map((lines) => ({
		header: lines[0],
		items: lines.slice(1),
	}));
};

const isSeeMore = (label: string) =>
	/^see more$/i.test(label) || /^today'?s deals$/i.test(label);

export const SidebarFromFile: React.FC<SidebarProps> = ({
	filePath,
	onChange,
	onSeeMore,
	selectedFilter,
	setSelectedFilter,
}) => {
	const [text, setText] = useState<string>("");

	useEffect(() => {
		const sourceUrl = new URL(filePath, window.location.origin).toString();

		fetch(sourceUrl)
			.then((res) => res.text())
			.then(setText)
			.catch((err) => {
				console.error("Failed to load sidebar file", err);
			});
	}, [filePath]);

	const groups = useMemo(() => (text ? parseSidebar(text) : []), [text]);
	const [selection, setSelection] = useState<Record<string, boolean>>({});

	const toggle = (key: string) => {
		setSelection((prev) => {
			const next = { ...prev, [key]: !prev[key] };
			onChange?.(next);
			return next;
		});
	};

	return (
		<aside
			aria-label="Filter results"
			style={{
				width: 300,
				borderRight: "1px solid #e5e7eb",
				padding: 12,
				overflowY: "auto",
				background: "#fff",
			}}
		>
			{groups.map((group) => {
				const gid = slug(group.header);
				return (
					<section
						className="sidebar-section  hover:text-orange-600"
						key={gid}
						style={{
							paddingBottom: 16,
							marginBottom: 16,
							borderBottom: "1px solid #f1f5f9",
							color: "black"
						}}
					>
						{/* h2, not h3: this follows the page's own h1 ("Search Results
						    for ...") directly, and skipping to h3 flagged as an
						    out-of-order heading structure in Lighthouse. */}
						<h2 style={{ fontWeight: 700, marginBottom: 8, marginTop: 0, fontSize: "inherit" }}>{group.header}</h2>
						<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
							{group.items.map((label, idx) => {
								const key = `${group.header}::${label}`;
								const id = `${gid}-${slug(label)}-${idx}`;

								if (isSeeMore(label)) {
									return (
										<li key={key}
											style={{
												margin: "6px 0",

											}}>
											<button
												type="button"
												onClick={() => onSeeMore?.(group.header)}
												style={{
													background: "none",
													border: "none",
													cursor: "pointer",
													textDecoration: "underline",
													fontSize: 14,
													padding: 0,
												}}
											>
												{label}
											</button>
										</li>
									);
								}

								return (
									<li key={key} style={{ margin: "6px 0" }}>
										<label
											htmlFor={id}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												cursor: "pointer",
												fontSize: 14,
											}}
										>
											<input
												id={id}
												type="checkbox"
												checked={!!selection[key]}
												onChange={() => {
													toggle(key)
													if (setSelectedFilter) {
														if (selectedFilter?.includes(label)) {
															setSelectedFilter(selectedFilter.filter(item => item !== label));
														} else {
															setSelectedFilter([...(selectedFilter || []), label]);
														}
													}
												}}
											/>
											<span>{label}</span>
										</label>
									</li>
								);
							})}
						</ul>
					</section>
				);
			})}
		</aside>
	);
};
