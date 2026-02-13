import json
import os
import uvicorn
import configparser

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request

import openai

import tiktoken


config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), 'config.ini')
config.read(config_path)
API_KEY = config.get("settings", "deepseek_api").split('#')[0].strip()
raw_base_url = config.get("settings", "deepseek_base_url", fallback="https://api.deepseek.com").strip()

normalized_base_url = raw_base_url.rstrip('/')
if normalized_base_url.lower().endswith('/v1'):
	normalized_base_url = normalized_base_url[:-3].rstrip('/')

DEEPSEEK_BASE_URL = normalized_base_url or "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

openai.api_key = API_KEY
openai.api_base = DEEPSEEK_BASE_URL
setattr(openai, "base_url", DEEPSEEK_BASE_URL)

app = FastAPI()


app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

BATCH_SIZE = 20


def num_tokens_from_string(string: str, encoding_name: str = 'cl100k_base') -> int:
	try:
		encoding = tiktoken.get_encoding(encoding_name)
	except KeyError:
		encoding = tiktoken.encoding_for_model(encoding_name)
	return len(encoding.encode(string))

@app.post("/get_llm_recs")
async def get_llm_rec(request: Request):
	"""
	Endpoint to get LLM recommendations based on a query.
	"""
	# Parse request body
	data = await request.json()
	query = data.get("query")
	filename = data.get("filename", "default")
	summaries = data.get("summaries", [])
	print(data)

	#check for cache hit 
	cache_key = f"{query}_{filename}"
	cache_file = f"cache/{cache_key}.json"
	if os.path.exists(cache_file):
		print(f"Cache hit for {cache_key}, loading from {cache_file}")
		with open(cache_file, "r") as f:
			cached_data = json.load(f)
		return {
			"query": cached_data["query"],
			"recommendation": cached_data["results"]
		}
	else:
		print(f"Cache miss for {cache_key}, processing query.")
	
		print("Received query:", query)
		masked_key = API_KEY[:6] + "..." + API_KEY[-4:] if API_KEY and len(API_KEY) > 10 else "***"
		print("DeepSeek API key:", masked_key)
	# print("File name:", filename)
	# print("summaries", summaries)

	system = '''
			You are re-ranking shopping/search snippets for relevance and usefulness.
			Score each item 0–100 for how well it satisfies the user's query.
			Consider exact/semantic match, key specs, price/value, quality signals, and any constraints in the query.
			Return STRICT JSON: {"ranked":[{"idx":<number>,"score":<0-100>,"reason":"<short>"}]}. No extra text.'''

	if summaries:
		print("Summaries provided, using them to create batch.")
		batch = [{"idx": idx, "summary": summary} for idx, summary in enumerate(summaries)]
		#only use the first 20 summaries
		batch = batch[:BATCH_SIZE]
		print("Batch created with summaries:", len(batch))
		user = f'''User query: "{query}"
			Snippets (JSON): {json.dumps(batch)}'''
	else:
		batch = []
		user = f'''User query: "{query}"
			No snippets provided. If possible, respond with an empty ranked list.'''


	messages = [ { "role": "system", "content": system },{ "role": "user", "content": user }]

	#check token length and reduce if necessary
	total_tokens = sum(num_tokens_from_string(m['content']) for m in messages)
	print(f"Total tokens in messages: {total_tokens}")
	if total_tokens > 110000:
		print("Token limit exceeded, trimming summaries.")
		#trim summaries to fit within token limit
		while total_tokens > 110000 and len(batch) > 1:
			batch.pop()
			user = f'''User query: "{query}"
				Snippets (JSON): {json.dumps(batch)}'''
			messages = [ { "role": "system", "content": system },{ "role": "user", "content": user }]
			total_tokens = sum(num_tokens_from_string(m['content']) for m in messages)
			print(f"Trimmed batch to {len(batch)} items, total tokens now {total_tokens}")
		if total_tokens > 110000:
			print("Still over token limit after trimming, returning error.")
			return {"error": "Query too long even after trimming summaries."}
		else:
			print(f"Final batch size after trimming: {len(batch)}, total tokens: {total_tokens}")
	else:
		print("Token count within limit, proceeding.")
	


	# call openai API
	response = openai.chat.completions.create(
		model=DEEPSEEK_MODEL,
		messages=messages,
		temperature=0.0
	)

	content = response.choices[0].message.content

	#parse the content into json
	try:
		content = json.loads(content)
	except json.JSONDecodeError as e:
		print("Error decoding JSON:", e)
		print("Content received:", content)
		return {"error": "Invalid JSON response from LLM"}
	
	if "ranked" not in content:
		print("Invalid response format from LLM, expected 'ranked' key.")
		return {"error": "Invalid response format from LLM"}
	if not isinstance(content["ranked"], list):
		print("Invalid response format from LLM, 'ranked' should be a list.")
		return {"error": "Invalid response format from LLM"}
	if len(content["ranked"]) == 0:
		print("No ranked items returned by LLM.")
		return {"error": "No ranked items returned by LLM"}
	

	
	print("LLM response content:", content)
	

	score_map = {}
	for r in (content.get("ranked") or []):
		idx = int(r.get("idx", -1))
		score = max(0, min(1, float(r.get("score", 0))))  # mimic clamp
		reason = str(r.get("reason", ""))

		if isinstance(idx, int):
			score_map[idx] = {"score": score, "reason": reason}

	merged = []
	for s in summaries:
		entry = score_map.get(s["idx"])
		merged.append({
			"idx": s["idx"],
			"html": s["html"],
			"summary": s["summary"],
			"score": entry["score"] if entry else 0,
			"reason": entry["reason"] if entry else "No LLM score (fallback).",
		})

	# Sort: first by score descending, then by idx ascending
	merged.sort(key=lambda x: (-x["score"], x["idx"]))

	# cache the results with the query and filename
	cache_key = f"{query}_{filename}"
	cache_file = f"cache/{cache_key}.json"
	if not os.path.exists("cache"):
		os.makedirs("cache")
	with open(cache_file, "w") as f:
		json.dump({
			"query": query,
			"filename": filename,
			"summaries": summaries,
			"results": merged
		}, f, indent=2)
	print(f"Results cached to {cache_file}")


	# Create final response

	response = {
		"query": query,
		"recommendation": merged

	}

	return response


@app.post("/generatePage")
async def generate_dynamic_page(request: Request):
    """
    Generate a dynamic web page HTML snippet for a given page title.
    """
    data = await request.json()
    page_name = data.get("pageName", "Untitled Page")
    site_context = data.get("siteContext", """
    - The site is called RiverBuy, a clone of Amazon.
    - Built using Tailwind CSS.
    - Pages include a top header with logo, search bar, cart, and account.
    - Navigation bar has sections like "Gift Cards", "Today's Deals", etc.
    - Main content often includes product grids, promo banners, FAQs.
    - Design is responsive, e-commerce themed, and clean.
    """)

    system_prompt = "You are a helpful HTML generator for an e-commerce site styled with Tailwind CSS."
    user_prompt = f"""
    Website context:
    {site_context.strip()}

    Please generate a high-quality HTML snippet for a page titled "{page_name}". 
    Include appropriate e-commerce content: e.g., hero banner, description, possible offers, and some dummy products or FAQs.

    Use Tailwind CSS for styling and return ONLY the inner HTML (no <html>, <head>, etc.).
    Make sure it's a <div> or group of <div>s that can be injected directly into a React page.
    """

    # Send to DeepSeek (OpenAI-compatible)
    try:
        response = openai.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        generated_html = response.choices[0].message.content
        return {
            "pageName": page_name,
            "html": generated_html.strip()
        }

    except Exception as e:
        print("LLM error:", str(e))
        return {"error": f"Failed to generate page: {str(e)}"}


@app.post("/pickBestFile")
async def pick_best_file(request: Request):
	"""
	Pick the single most relevant filename from a list for a user's query.
	Uses the API key from config.ini; no key needed from the frontend.
	"""
	data = await request.json()
	query = (data.get("query") or "").strip()
	candidates = data.get("candidates") or []
	model = data.get("model", "deepseek-chat")

	if not query or not candidates:
		return {"best": None}

	system = (
		"You pick the SINGLE most relevant filename from a list for a user's shopping/search query.\n"
		"Prefer exact topical fit (e.g., milk vs shoes), then specificity.\n"
		'Return STRICT JSON: {"best":"<one of the provided filenames>","reason":"<short>"} — no extra text.'
	)
	user = f'Query: "{query}"\nCandidates (JSON array): {json.dumps(candidates)}\nPick exactly one "best" from the list.'

	try:
		response = openai.chat.completions.create(
			model=model,
			messages=[
				{"role": "system", "content": system},
				{"role": "user", "content": user},
			],
			temperature=0,
			max_tokens=256,
		)
		content = response.choices[0].message.content or "{}"
		parsed = json.loads(content)
		best = parsed.get("best")
		reason = parsed.get("reason", "")
		if best and best in candidates:

			print("pickBestFile response:", {"best": best, "reason": reason})
			return {"best": best, "reason": reason}
	except (json.JSONDecodeError, Exception) as e:
		print("pickBestFile error:", e)
	return {"best": None}


if __name__ == "__main__":
	print("running main")
	uvicorn.run("main:app", port=8089, host="0.0.0.0", log_level="info", reload=True, workers=4)