export type ParsedProduct = {
	name?: string | null;
	brand?: string | null;
	priceText?: string | null;   // e.g., "$59.99" or "Click to see price"
	priceValue?: number | null;  // numeric if we can parse it
	rating?: number | null;      // e.g., 4.5
	ratingCount?: number | null; // e.g., 11143
	imageUrl?: string | null; // URL of product image, if available

};

export function extractProductFromHtml(html: string): ParsedProduct {

	console.log("Extracting product from HTML snippet:", html); // Log first 200 chars for debugging
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const root = doc.querySelector(".snippet") ?? doc;

	const getText = (el: Element | null | undefined) =>
		(el?.textContent || "").trim().replace(/\s+/g, " ");


	const getImgSrc = (html: string): string | null => {
		const doc = new DOMParser().parseFromString(html, "text/html");
		const img = doc.querySelector(".snippet img") || doc.querySelector("img");
		return img?.getAttribute("src") || null;
	}

	const imageUrl = getImgSrc(html);



	// ---- NAME / BRAND ---------------------------------------------------------
	// Try Amazon search card patterns first, then fallbacks.
	const brand =
		getText(root.querySelector('[data-cy="title-recipe"] .a-row h2 .a-color-base')) ||
		null;

	// Main title can appear in a couple of places on Amazon search results.
	const nameCandidates = [
		'[data-cy="title-recipe"] a h2 span',      // common result title
		'[data-cy="title-recipe"] h2 span',        // sometimes not wrapped in <a>
		'h2.a-size-base-plus span',                // generic h2 + span
		'h2.a-size-mini.s-line-clamp-2 span',      // alt layout
	];
	let name: string | null = null;
	for (const sel of nameCandidates) {
		const t = getText(root.querySelector(sel));
		if (t) { name = t; break; }
	}

	// ---- RATING ---------------------------------------------------------------
	// Usually in an <i> with .a-icon-alt: "4.5 out of 5 stars"
	const ratingAlt = getText(root.querySelector('i .a-icon-alt, i.a-icon .a-icon-alt'));
	let rating: number | null = null;
	const ratingMatch = ratingAlt.match(/([\d.]+)\s+out of\s+5/i);
	if (ratingMatch) rating = parseFloat(ratingMatch[1]);

	// Rating count (e.g., "11,143")
	const ratingCountText =
		getText(root.querySelector('[data-cy="reviews-block"] a[aria-label*="ratings"] span')) ||
		getText(root.querySelector('a[aria-label$="ratings"] span')) ||
		getText(root.querySelector('a[aria-label$="ratings"]')) ||
		null;

	const ratingCount = ratingCountText
		? Number(ratingCountText.replace(/[^\d]/g, "")) || null
		: null;

	// ---- PRICE ---------------------------------------------------------------
	// Amazon often uses:
	// - .a-price .a-offscreen for the visible price
	// - struck-through compare-at in .a-text-price
	// - or "Click to see price" in .s-price-instructions-style
	let priceText: string | null =
		getText(root.querySelector('.a-price .a-offscreen')) ||
		getText(root.querySelector('.s-price-instructions-style')) ||
		getText(root.querySelector('.a-price.a-text-price')) ||
		null;

	// Clean “Click to see price” into a consistent field; keep raw text
	// but try to parse a numeric value if present
	let priceValue: number | null = null;
	if (priceText) {
		const num = priceText.replace(/[^0-9.,]/g, "");
		// Prefer dot as decimal; simple parse that works for US-style prices
		const normalized = num.replace(/,/g, "");
		priceValue = normalized ? Number(normalized) : null;
		if (Number.isNaN(priceValue) || priceText.toLowerCase().includes("click to see")) {
			priceValue = null;
			//set priceText to be a $55
			priceText = "$55";
		}
	}

	// TODO: maybe use DeepSeek to generate product description?

	return { name, brand, priceText, priceValue, rating, ratingCount, imageUrl };
}
