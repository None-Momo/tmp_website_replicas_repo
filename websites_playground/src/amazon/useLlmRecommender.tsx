import { useEffect, useState } from "react";
import { llmRankFiltered, RankedSnippet } from "./llm_recsys"

type HookOpts = {
	apiKey: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	debounceMs?: number; // default 250
	filename?: string; // for debugging
};

export function useLlmRecommender(
	filtered: string[],
	query: string,
	opts: HookOpts
) {


	// return { ranked: null, loading: false, error: null }; // for testing without LLM callsß

	const [ranked, setRanked] = useState<RankedSnippet[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const ctrl = new AbortController();
		const t = setTimeout(async () => {
			if (!opts?.apiKey || !filtered?.length) {
				setRanked(null);
				console.log("LLM Recommender disabled (no API key or no snippets)");
				return filtered;
			}
			try {
				setLoading(true);
				setError(null);
				console.log("Calling LLM ranker with query:", query, "and", filtered.length, "snippets");
				const out = await llmRankFiltered(filtered, query, opts, ctrl.signal, opts?.filename);
				if (!cancelled) setRanked(out);
			} catch (e: any) {
				if (!cancelled) setError(e?.message ?? String(e));
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, opts?.debounceMs ?? 250);

		return () => {
			cancelled = true;
			ctrl.abort();
			clearTimeout(t);
		};
	}, [filtered, query, opts?.apiKey, opts?.model, opts?.temperature, opts?.maxTokens, opts?.debounceMs]);


	return { ranked, loading, error };
}
