// llmRecommender.ts
export type RankedSnippet = {
	idx: number;          // original index in `filtered`
	html: string;         // the original snippet
	summary: string;      // compact text sent to the LLM
	score: number;        // 0..100
	reason: string;       // LLM explanation
};

type DeepSeekOpts = {
	apiKey: string;
	model?: string;        // default: deepseek-chat
	temperature?: number;  // default: 0
	maxTokens?: number;    // default: 600
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Try to extract useful text from an HTML snippet; fall back to raw text. */
function summarizeSnippet(snippetHtml: string): string {
	try {
		const html = `<div id="root">${snippetHtml}</div>`;
		const doc = new DOMParser().parseFromString(html, "text/html");
		const root = doc.getElementById("root")!;
		// Try common e-commerce fields:
		const title =
			root.querySelector('h2 a[aria-label]')?.getAttribute("aria-label") ||
			root.querySelector("h2 span")?.textContent?.trim() ||
			root.querySelector("h2")?.textContent?.trim();

		const brand =
			root.querySelector(".a-size-base-plus.a-color-base")?.textContent?.trim() ||
			root.querySelector(".a-color-secondary")?.textContent?.trim();

		const price =
			root.querySelector(".a-price .a-offscreen")?.textContent?.trim() ||
			root.querySelector(".a-price")?.textContent?.trim();

		const rating =
			root.querySelector(".a-icon-alt")?.textContent?.trim() || // e.g., "4.7 out of 5 stars"
			undefined;

		const text = root.textContent?.replace(/\s+/g, " ").trim() ?? "";
		const base = [
			title ? `title: ${title}` : "",
			brand ? `brand: ${brand}` : "",
			price ? `price: ${price}` : "",
			rating ? `rating: ${rating}` : "",
		]
			.filter(Boolean)
			.join(" | ");

		const tail = text.length > 400 ? text.slice(0, 400) + "…" : text;
		return (base ? base + " | " : "") + tail;
	} catch {
		const t = snippetHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
		return t.length > 500 ? t.slice(0, 500) + "…" : t;
	}
}

function buildPrompt(query: string, batch: { idx: number; summary: string }[]) {
	const system = `You are re-ranking shopping/search snippets for relevance and usefulness.
Score each item 0–100 for how well it satisfies the user's query.
Consider exact/semantic match, key specs, price/value, quality signals, and any constraints in the query.
Return STRICT JSON: {"ranked":[{"idx":<number>,"score":<0-100>,"reason":"<short>"}]}. No extra text.`;

	const user = `User query: "${query}"
Snippets (JSON):
${JSON.stringify(
		batch.map((b) => ({ idx: b.idx, summary: b.summary })),
		null,
		2
	)}
`;
	return { system, user };
}

/** Core: given filtered snippets and a query, get LLM scores. */
export async function llmRankFiltered(
	filtered: string[],
	query: string,
	opts: DeepSeekOpts,
	signal?: AbortSignal,
	filename?: string
): Promise<RankedSnippet[]> {
	const {
		apiKey,
		model = "deepseek-chat",
		temperature = 0,
		maxTokens = 600,
	} = opts;

	if (!filtered?.length || !query?.trim()) {
		// Nothing or no query: keep original order with neutral scores.
		return filtered.map((html, idx) => ({
			idx,
			html,
			summary: summarizeSnippet(html),
			score: 0,
			reason: "No query provided (passthrough).",
		}));
	}

	// Compress for token efficiency
	const summaries = filtered.map((html, idx) => ({
		idx,
		html,
		summary: summarizeSnippet(html),
	}));

	// Batch to keep prompts compact
	const BATCH = 20;
	const results: RankedSnippet[] = [];
	const scoreMap = new Map<number, { score: number; reason: string }>();

	for (let i = 0; i < summaries.length; i += BATCH) {

		const batch = summaries.slice(i, i + BATCH);
		const { system, user } = buildPrompt(query, batch);


		// split the filename by slashes and take the last part
		const filenamePart = filename ? filename.split('/').pop() : 'unknown';

		const res1 = await fetch("http://127.0.0.1:8089/get_llm_recs", {
			method: "POST",
			signal,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query: query,
				filename: filenamePart,
				summaries: batch,
				system: system,

			})

		}).then((r) => r.json());

		console.log("LLM response for batch:", res1);

		let merged = res1["recommendation"]

		results.push(...merged.map((item: any) => {
			const idx = item.idx;
			const score = clamp(item.score);
			const reason = item.reason || "No reason provided.";
			scoreMap.set(idx, { score, reason });
			return {
				idx,
				html: summaries[idx].html,
				summary: summaries[idx].summary,
				score,
				reason,
			};
		}));

		break; // For testing, remove to process all batches
	}

	return results;

}
