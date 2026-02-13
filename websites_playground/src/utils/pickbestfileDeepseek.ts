export async function fetchFromBackend(
    query: string,
    candidates: string[],
    apiKey: string,
    model = "deepseek-chat"
): Promise<{ best: string | null; reason?: string }> {
    // Guard/short-circuit
    const q = query.trim();
    if (!q || candidates.length === 0) return { best: null };
    const params = new URLSearchParams({
        query: q,
        candidates: JSON.stringify(candidates),
        model,
    });

    // console.log("Fetching best file from backend with params:", params.toString());
    const res = await fetch(`http://localhost:3001/api/search?query=milk`, {
        headers: {
            // Authorization: `Bearer ${apiKey}`,
            // "Content-Type": "application/json",
            // "Access-Control-Allow-Origin": "*",
        },
    });

    console.log("Backend response:", res);
    if (!res.ok) {
        // Caller will fallback to naive includes()
        return { best: null };
    }
    const data = await res.json();
    if (data?.best && candidates.includes(data.best)) {
        return { best: data.best, reason: data.reason };
    }
    return { best: null };
}

export async function pickBestFileWithDeepseek(
    query: string,
    candidates: string[],
    apiKey: string,
    model = "deepseek-chat"
): Promise<{ best: string | null; reason?: string }> {
    // Guard/short-circuit
    const q = query.trim();
    if (!q || candidates.length === 0) return { best: null };

    const system =
        `You pick the SINGLE most relevant filename from a list for a user's shopping/search query.\n` +
        `Prefer exact topical fit (e.g., milk vs shoes), then specificity.\n` +
        `Return STRICT JSON: {"best":"<one of the provided filenames>","reason":"<short>"} — no extra text.`;

    const user =
        `Query: "${q}"\n` +
        `Candidates (JSON array): ${JSON.stringify(candidates)}\n` +
        `Pick exactly one "best" from the list.`;

    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            temperature: 0,
            max_tokens: 256,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
        }),
    });

    if (!res.ok) {
        // Caller will fallback to naive includes()
        return { best: null };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";

    try {
        const parsed = JSON.parse(content);
        if (parsed?.best && candidates.includes(parsed.best)) {
            return { best: parsed.best, reason: parsed.reason };
        }
    } catch {
        /* fall through */
    }
    return { best: null };
}

// naive fallback if the model can’t decide ----
export function naiveMatch(query: string, candidates: string[]): string | null {
    const q = query.toLowerCase();
    return candidates.find((f) => f.toLowerCase().includes(q)) ?? null;
}