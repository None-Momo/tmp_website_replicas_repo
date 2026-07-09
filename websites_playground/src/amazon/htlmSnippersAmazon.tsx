import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { useLlmRecommender } from "./useLlmRecommender";
import { DEEPSEEK_API_KEY } from "../utils/deepseek_key";

type RenderMode = "div" | "iframe" | "detail" | "sidebar";


function makeSrcDoc(snippetHtml: string, customCSS: string) {

	// console.log("Custom CSS being used:", customCSS || "No custom CSS");


	const parser = new DOMParser();
	const doc = parser.parseFromString(snippetHtml, "text/html");

	// Remove all href attributes from <a> elements
	doc.querySelectorAll("a").forEach(a => {
		a.removeAttribute("href");
	});

	// Serialize back to string
	const sanitizedSnippet = doc.body.innerHTML;

	return `<!doctype html>
			<html>
			<head>
				<meta charset="utf-8" />
				<base target="_blank" />
				<style>
				/* your reset / theme */
				:root { color-scheme: light dark; }
				html,body { margin:0; padding:0; font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; }
				img,svg,video,canvas { max-width: 100%; height: auto; }
				a { text-decoration: none; }
				/* your design system */
				.snippet { padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; }
				.snippet h1,.snippet h2,.snippet h3 { margin: 0 0 .5rem; line-height: 1.2; }
				.snippet .price { font-weight: 700; }
				/* put anything else you want here… */
				${customCSS || ""}
				</style>
			</head>
			<body>
				<div class="snippet">${sanitizedSnippet}</div>
			</body>
			</html>`;
}


const customCSS = `
  /* Example: override title/link look */
  .snippet h2 a { color: #111827 !important; }
  .snippet h2 a:hover { text-decoration: underline !important; }
  /* Example: card layout */
  .snippet { box-shadow: 0 1px 2px rgb(0 0 0 / 0.05); }
  div.a-section.a-section.ac-badge-popover.ac-popover-text {opacity:0;}
  div.a-section.a-section.ac-badge-popover.ac-popover-text > :first-child {opacity:1; cursor: pointer; background:black; font-weight:400; color:white; font-size:9px; }
  span.a-badge-text, #BEST_SELLER > div > span.rio-badge-label.rio-badge-style-BEST_SELLER.rio-badge-size-desktop {font-size:11px; font-weight:400; padding:2px 4px; line-height:1; background:black; color:white; border-radius:3px; margin-left:4px;}
  #BEST_SELLER > div > span.rio-badge-label.rio-badge-style-BEST_SELLER.rio-badge-size-desktop {background:rgb(224, 151, 15);  } 
 
  div>h2.a-size-mini { font-size: 16px; line-height: 1.2 ; margin-bottom: 6px ; font-weight: 700; text-transform: capitalize; }
  div.a-size-small, div.a-size-base { font-size: 12px; margin-bottom: 6px ; font-weight: 400; color: #6b7280; }
  span.a-button-inner{ font-size: 14px; font-weight: 500; color: #111827; background:rgb(224, 151, 15); border-radius: 6px; padding: 6px 12px; border: 1px solid rgb(224, 151, 15); display: inline-block;}
  span.aok-offscreen, .a-offscreen, #BEST_SELLER > div > span.a-size-small.rio-badge-supplementary-text.rio-hidden{display:none;}
  div.s-price-instructions-styles { font-size: 14px; font-weight: 700 !important; color:rgb(227, 192, 14) !important;  margin-bottom: 6px ; }
  .a-price{ font-size: 18px; font-weight: 700 !important; color: #111827 !important; margin-right: 4px ; }
  div > div > div > span > div > div > div.a-section.a-spacing-small.puis-padding-left-micro.puis-padding-right-micro > div.a-section.a-spacing-none.a-spacing-top-small.s-price-instructions-style > div > div:nth-child(1) > a > div > span.a-price.a-text-price
  			{ text-decoration: line-through; color: #6b7280 !important; font-weight: 400 !important; font-size: 14px !important; margin-right: 4px ; }

			.aok-hidden { display: none !important }


`;



export interface HtmlSnippetsProps {
	/** URL to the .txt file (e.g., /amazon_shoe_results.txt) */
	source: string;
	navigateToDetails?: (product: string) => void;
	/** Optional custom delimiter if your file already separates snippets with a marker */
	delimiter?: string; // e.g., "-----SNIPPET-----"
	/** Choose how each snippet is embedded (div = faster, iframe = stricter isolation) */
	renderMode?: RenderMode;
	/** Extra className for the grid wrapper */
	className?: string;
	/** Minimum snippet length to keep after splitting (filters noise) */
	minLength?: number;
	/** Optional search query to filter snippets (client-side substring match) */
	query?: string;  // now internal state
	/** Callback to notify parent when results are loaded */
	setResultsLoaded?: (loaded: boolean) => void;
	/** Currently selected filters from sidebar */
	selectedFilters?: Array<string>;
	// custom CSS to inject into iframe
	customCSSProp?: string;
	//get orinetation as prop
	orientation?: "grid" | "list";


}

/** Parse a sidebar price-range label like "Up to $15", "$20 to $40",
 *  "$400 & above" into a numeric range; null for non-price labels. */
function parsePriceRangeLabel(label: string): { min: number; max: number } | null {
	if (!label.includes("$")) return null;
	const nums = (label.match(/\$\s?(\d+(?:\.\d+)?)/g) || []).map(s => parseFloat(s.replace(/[^0-9.]/g, "")));
	if (nums.length === 0) return null;
	const lower = label.toLowerCase();
	if (/up to/.test(lower)) return { min: 0, max: nums[0] };
	if (/above|over|\+/.test(lower)) return { min: nums[0], max: Infinity };
	if (nums.length >= 2) return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
	return null;
}

/** First dollar amount in a snippet = its current price (the a-offscreen
 *  current price precedes the strikethrough list price in Amazon markup). */
function extractSnippetPrice(html: string): number | null {
	const match = html.match(/\$\s?(\d{1,5}(?:\.\d{1,2})?)/);
	return match ? parseFloat(match[1]) : null;
}

/** Extract a human title from a result snippet (product name, business name,
 *  etc.) so each card gets a unique accessible name. Works for both the Amazon
 *  product markup and the Yelp/Grumble business markup this component renders.
 *  Falls back to the image alt text or the first substantial text run. */
function extractSnippetTitle(html: string): string {
	try {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const root = doc.querySelector('.snippet') ?? doc.body ?? doc;
		const getText = (el: Element | null) => (el?.textContent || '').trim().replace(/\s+/g, ' ');
		const candidates = [
			'[data-cy="title-recipe"] h2 span',
			'h2 span',
			'h2', 'h3', 'h4',
			'a[href] span',
		];
		for (const sel of candidates) {
			const t = getText(root.querySelector(sel));
			if (t && t.length >= 3) return t.slice(0, 90);
		}
		const alt = root.querySelector('img[alt]')?.getAttribute('alt')?.trim();
		if (alt && alt.length >= 3) return alt.slice(0, 90);
		const raw = getText(root as Element);
		return raw ? raw.slice(0, 60) : '';
	} catch {
		return '';
	}
}

/** Slugify a title for a stable, unique data-testid. */
function slugifyTitle(title: string): string {
	return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
}

/** Heuristics to split a big text file into discrete HTML snippets */
function splitSnippets(text: string, delimiter?: string): string[] {
	if (delimiter) {
		return text.split(delimiter).map(s => s.trim()).filter(Boolean);
	}

	// Auto-split heuristics tailored for Amazon-like blocks you shared:
	// 1) split at each new "sg-col-inner" block
	// 2) fallback: double newlines
	const parts = text
		.split(/(?=<div\s+class="sg-col-inner")/g)
		.flatMap(p => p.split(/(?=^\s*<div\s+cel_widget_id=)/gm)); // secondary cue

	if (parts.length > 1) {
		return parts.map(s => s.trim()).filter(Boolean);
	}

	// Fallback split by blank lines
	return text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
}

/** Sanitize HTML safely before injecting into the DOM */
function sanitize(html: string): string {
		const clean = DOMPurify.sanitize(html, {
			USE_PROFILES: { html: true },
			ADD_ATTR: ["target", "rel", "aria-label", "role", "alt", "data-*"],
		});

		const parser = new DOMParser();
		const doc = parser.parseFromString(clean, "text/html");
		doc.querySelectorAll("img:not([alt])").forEach((img) => {
			img.setAttribute("alt", "");
		});
		return doc.body.innerHTML;
	}

export const HtmlSnippets: React.FC<HtmlSnippetsProps> = ({
	source,
	navigateToDetails,
	delimiter,
	renderMode = "div",
	className = "",
	minLength = 120,
	query = "",
	setResultsLoaded,
	selectedFilters = [],
	customCSSProp = null,
	orientation = "grid",
}) => {
	const [raw, setRaw] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (customCSSProp) console.log("Logging the css prop", customCSSProp);
		else console.log("No custom css prop provided");
	}, []);


	useEffect(() => {
		//only fetch id renderMode is not iframe
		if (renderMode === "iframe" || renderMode === "detail") return;
		// fetch the raw text file
		let cancelled = false;

		const sourceUrl = new URL(source, window.location.origin).toString();

		fetch(sourceUrl)
			.then(r => {
				if (!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`);
				return r.text();
			})
			.then(t => !cancelled && setRaw(t))
			.catch(e => !cancelled && setError(e.message));
		return () => {
			cancelled = true;
		};
	}, [source]);

	const allSnippets = useMemo(() => {
		if (!raw) return [];
		return splitSnippets(raw, delimiter).filter(s => s.length >= minLength);
	}, [raw, delimiter, minLength]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return allSnippets;
		// return allSnippets.filter(s => s.toLowerCase().includes(q));
	}, [allSnippets, query]);

	// Derive the flag after `filtered` exists — and log each factor.
	const llmEnabled = React.useMemo(() => {
		const backendRankingEnabled = typeof window !== "undefined" && (window as any).ENABLE_LLM_RERANK === true;
		const modeOk = renderMode !== "iframe" && renderMode !== "detail";
		const hasQuery = typeof query === "string" && query.trim().length > 0;
		const hasSnippets = Array.isArray(filtered) && filtered.length > 0;

		if (process.env.NODE_ENV !== "production") {
			console.log("[LLM flag check]", {
				renderMode,
				modeOk,
				queryRaw: query,
				queryTrimLen: query?.trim().length ?? 0,
				hasQuery,
				filteredLen: filtered?.length ?? 0,
				firstSnippetPreview: filtered?.[0]?.slice?.(0, 80) ?? null,
			});
		}

		return backendRankingEnabled && modeOk && hasQuery && hasSnippets;
		// Depend on the *array* (not only length) so this recomputes if the array object changes.
	}, [renderMode, query, filtered]);

	const llmOpts = useMemo(() => ({
		apiKey: DEEPSEEK_API_KEY,
		model: "deepseek-chat",
		temperature: 0,
		maxTokens: 600,
		debounceMs: 250,
		filename: source, // for debugging
	}), []);

	const { ranked, loading, error: llmErr } = useLlmRecommender(
		llmEnabled ? filtered : [],             // pass [] to "disable"
		llmEnabled ? query : "",                // pass "" to "disable"
		llmOpts
	);

	//log loading state
	useEffect(() => {
		if (!loading && filtered.length > 0) {
			if (ranked && ranked.length > 0) {
				console.log("LLM ranking completed.");
			}
			if (llmErr) {
				console.warn("LLM ranking failed; showing static results.", llmErr);
			}
			setResultsLoaded && setResultsLoaded(true);
		}
	}, [filtered.length, ranked, llmErr, setResultsLoaded, loading]);

	const toShow = ranked?.length ? ranked.map(r => r.html) : filtered;

	const cleaned = useMemo(() => toShow.map(h => sanitize(h)), [toShow]);

	const matchesSelectedFilters = (clean: string) => {
		if (selectedFilters.length === 0) return true;
		return selectedFilters.some(filter => {
			const range = parsePriceRangeLabel(filter);
			if (range) {
				const price = extractSnippetPrice(clean);
				return price !== null && price >= range.min && price <= range.max;
			}
			return clean.toLowerCase().includes(filter.toLowerCase());
		});
	};

	const visibleCount = cleaned.filter(matchesSelectedFilters).length;

	if (error) {
		return (
			<div className="p-4 rounded bg-red-50 text-red-700" role="alert">
				Failed to load snippets: {error}
			</div>
		);
	}


	return (
		<section className={["w-full", className].join(" ")}>

			{/* Make each result card a single reliable click target: the injected
			    snippet HTML contains its own links, so a click landing on a child
			    link bypassed the card's "open details" navigation. Disabling
			    pointer events on descendants routes every click to the card. */}
			<style>{`article[data-testid^="result-card"] * { pointer-events: none; }`}</style>

			{!raw && (
				<div className="text-sm text-gray-500" role="status">Loading… {renderMode} </div>
			)}

			{/* Announce how many results are shown so screen reader users hear
			    when results load or a filter changes what is visible. */}
			<p className="sr-only" role="status" aria-live="polite">
				{raw && !loading ? `${visibleCount} result${visibleCount === 1 ? '' : 's'} shown` : ''}
			</p>

			<div className={orientation == "grid" ?
				"grid gap-4 md:grid-cols-2 xl:grid-cols-3"
				: "flex flex-col gap-4"}>

				{renderMode === "detail" &&
					// detailed view for product details page

					<article>
						{/* eslint-disable-next-line react/no-danger */}
						<div dangerouslySetInnerHTML={{ __html: source }} />
					</article>
				}

				{loading && (
					<div className="text-center">
						<div role="status">
							<svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
								<path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
							</svg>
							<span className="sr-only">Loading...</span>
						</div>
					</div>
				)}
				{cleaned.map((clean, idx) => {
					// Price-range labels ("Up to $15", "$20 to $40", "$400 & above")
					// never appear verbatim in product snippets, so plain substring
					// matching made every price filter return zero results. Parse
					// those labels into numeric ranges and compare against the
					// snippet's first listed price (the current, non-strikethrough
					// one); all other labels keep substring semantics.
					if (!matchesSelectedFilters(clean)) {
						return null; // Skip this snippet if it doesn't match any filter
					}
					if (renderMode === "iframe") {
						// strongest isolation; heavier and cannot inherit styles easily
							return (<iframe
								key={idx}
								title={`Search result ${idx + 1}`}
							sandbox="allow-popups allow-popups-to-escape-sandbox allow-forms allow-pointer-lock allow-same-origin allow-scripts"
							srcDoc={customCSSProp ? makeSrcDoc(clean, customCSSProp) : makeSrcDoc(clean, customCSS)}
							className="w-full min-h-[460px] rounded border"
						/>
						);
					}
					else if (renderMode === "sidebar") {
						console.log("Rendering sidebar snippet");
						// console.log(clean);
						return (<div>
							<h2 className="text-lg font-semibold mb-2">Product Details</h2>
						</div>
						)
					}

					// fast path: sanitized innerHTML
						// Give each card a UNIQUE accessible name (its product /
						// business title) plus a price hint, so an agent or screen
						// reader can target the specific item instead of an ambiguous
						// "Open search result N". This is what lets MORPH click the
						// intended row rather than the first match.
						const cardTitle = extractSnippetTitle(clean);
						const cardPrice = extractSnippetPrice(clean);
						const cardLabel = cardTitle
							? `Open details for ${cardTitle}${cardPrice !== null ? `, priced at $${cardPrice}` : ''}`
							: `Open search result ${idx + 1}`;
						return (
							<article
								onClick={(e) => {
									// console.log("Snippet clicked", { idx });
									e.preventDefault();
									navigateToDetails?.(customCSSProp ? makeSrcDoc(clean, customCSSProp) : makeSrcDoc(clean, customCSS))
								}}
								onKeyDown={(e) => {
									if (e.key !== "Enter" && e.key !== " ") return;
									e.preventDefault();
									navigateToDetails?.(customCSSProp ? makeSrcDoc(clean, customCSSProp) : makeSrcDoc(clean, customCSS));
								}}
								role={navigateToDetails ? "button" : undefined}
								tabIndex={navigateToDetails ? 0 : undefined}
								aria-label={cardLabel}
								data-testid={cardTitle ? `result-card-${slugifyTitle(cardTitle)}` : `result-card-${idx + 1}`}
								key={idx}
							// className="rounded border p-3 bg-white"
							// eslint-disable-next-line react/no-danger
							dangerouslySetInnerHTML={{ __html: customCSSProp ? makeSrcDoc(clean, customCSSProp) : makeSrcDoc(clean, customCSS) }}
						/>
					);
				})}
			</div>

			{filtered.length === 0 && raw && (
				<p className="mt-4 text-sm text-gray-500" role="status">
					No snippets match your filter.
				</p>
			)}
		</section>
	);
};

export default HtmlSnippets;
