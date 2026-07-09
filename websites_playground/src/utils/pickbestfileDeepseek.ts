import { BASE_API } from "./base_api";
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
    const res = await fetch(`${BASE_API}/search?query=milk`, {
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
        ? BASE_API
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

const includesAny = (text: string, terms: string[]) =>
    terms.some(term => text.includes(term));

const hasCandidate = (candidates: string[], filename: string) =>
    candidates.includes(filename) ? filename : null;

function pickFlightFile(query: string, candidates: string[]): string | null {
    const q = query.toLowerCase();
    const hasOrd = includesAny(q, ["ord", "chicago", "o'hare", "ohare"]);
    const hasLax = includesAny(q, ["lax", "los angeles"]);
    const hasNyc = includesAny(q, ["nyc", "new york", "jfk"]);
    const hasSin = includesAny(q, ["sin", "singapore"]);

    if (hasOrd && hasLax) return hasCandidate(candidates, "flight_ORDLAX_results.txt");
    if (hasNyc && hasSin) return hasCandidate(candidates, "flight_NYCSIN_results.txt");

    return null;
}

function pickAmazonFile(query: string, candidates: string[]): string | null {
    const q = query.toLowerCase();

    if (includesAny(q, ["milk", "dairy", "almond", "oat", "organic", "vegan"])) {
        return hasCandidate(candidates, "amazon_milk_results.txt")
            || hasCandidate(candidates, "amazon_milk_sidebar.txt");
    }

    if (includesAny(q, ["headphone", "headphones", "earbud", "earbuds", "audio", "noise cancelling", "bluetooth"])) {
        return hasCandidate(candidates, "amazon_headphones_results.txt")
            || hasCandidate(candidates, "amazon_headphones_sidebar.txt");
    }

    if (includesAny(q, ["shoe", "shoes", "sneaker", "sneakers", "running"])) {
        return hasCandidate(candidates, "amazon_shoes_results.txt")
            || hasCandidate(candidates, "amazon_shoes_sidebar.txt")
            || hasCandidate(candidates, "amazon_shoe_results_inlined.txt");
    }

    return null;
}

function pickYelpFile(query: string, candidates: string[]): string | null {
    const q = query.toLowerCase();

    if (includesAny(q, ["coffee", "cafe", "espresso", "work from", "work"])) {
        return hasCandidate(candidates, "yelp_coffee.txt");
    }

    if (includesAny(q, ["restaurant", "restaurants", "dinner", "lunch", "food", "salad", "vegan", "traditional", "fine dining", "innovative"])) {
        return hasCandidate(candidates, "yelp_restaurants.txt");
    }

    return null;
}

function pickStayScapeFile(query: string, candidates: string[]): string | null {
    const q = query.toLowerCase();

    if (includesAny(q, ["honolulu", "hawaii", "beach", "island"])) {
        return hasCandidate(candidates, "honolulu_airbnb_cards.txt");
    }

    if (includesAny(q, ["new york", "nyc", "ny", "manhattan", "brooklyn"])) {
        return hasCandidate(candidates, "NY_airbnb_cards.txt");
    }

    return null;
}

function pickDwellioFile(query: string, candidates: string[]): string | null {
    const q = query.toLowerCase();

    if (includesAny(q, ["san francisco", "sf", "bay area"])) {
        return hasCandidate(candidates, "SF_zillow_articles.txt")
            || hasCandidate(candidates, "zillow_articles.txt");
    }

    // The file previously named NY_zillow_articles.txt actually contains
    // Chicago, IL listings and was renamed to match its contents. There is
    // no New York dataset for Dwellio.
    if (includesAny(q, ["chicago", "illinois"])) {
        return hasCandidate(candidates, "Chicago_zillow_articles.txt");
    }

    return null;
}

export function pickBestLocalFile(query: string, candidates: string[]): string | null {
    const q = query.trim();
    if (!q || candidates.length === 0) return null;

    return pickFlightFile(q, candidates)
        || pickAmazonFile(q, candidates)
        || pickYelpFile(q, candidates)
        || pickStayScapeFile(q, candidates)
        || pickDwellioFile(q, candidates)
        || naiveMatch(q, candidates)
        || candidates[0]
        || null;
}
