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

/** Backend base URL (uses config.ini API key, no key in frontend). */
const getBackendBase = () =>
    typeof window !== "undefined" && window.location.port === "3000"
        ? "http://127.0.0.1:8089"
        : "/api";

export async function pickBestFileWithDeepseek(
    query: string,
    candidates: string[],
    _apiKey?: string, // Ignored: backend uses config.ini
    model = "deepseek-chat"
): Promise<{ best: string | null; reason?: string }> {
    const q = query.trim();
    if (!q || candidates.length === 0) return { best: null };

    const res = await fetch(`${getBackendBase()}/pickBestFile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, candidates, model }),
    });

    if (!res.ok) return { best: null };
    const data = await res.json();

    if (data?.best && candidates.includes(data.best)) {
        return { best: data.best, reason: data.reason };
    }
    return { best: null };
}

// naive fallback if the model can’t decide ----
export function naiveMatch(query: string, candidates: string[]): string | null {
    const q = query.toLowerCase();
    return candidates.find((f) => f.toLowerCase().includes(q)) ?? null;
}