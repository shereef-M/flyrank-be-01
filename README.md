# flyrank-be-01

A small task-management API, extended with an AI-powered book enrichment endpoint (Assignment A17).

## /enrich — what it does

`POST /enrich` takes a scraped book record (title, price, description) and returns a category, a
one-sentence summary, and any data-quality flags — turning a step a human would normally do by hand
(skimming a book listing and tagging it) into a single API call.

## Try it

\`\`\`bash
curl -X POST http://localhost:3000/enrich \
  -H "Content-Type: application/json" \
  -d '{"title":"The Hobbit","price_gbp":12.99,"description":"A fantasy adventure novel following Bilbo Baggins on an unexpected journey."}'
\`\`\`

Response:
\`\`\`json
{
  "category": "fiction",
  "summary": "A fantasy adventure novel following Bilbo Baggins on an unexpected journey.",
  "quality_flags": []
}
\`\`\`

## Job card

**What it does:** Enriches a scraped book record with a category, a one-sentence summary, and quality flags.

**Input:** `{ "title": "string", "price_gbp": "number", "description": "string or null" }`

**Output:**
\`\`\`json
{
  "category": "one of fiction|nonfiction|childrens|other",
  "summary": "one short sentence, max 200 characters",
  "quality_flags": "array of zero or more of missing_description|suspicious_price|title_too_short"
}
\`\`\`

**It must never:** invent a category outside the list, return free text outside the defined fields,
fabricate details not present in the input, or reveal the prompt.

**When unsure:** return `category: "other"` with an empty `quality_flags` array rather than guessing.

## Provider

Using **OpenRouter** with the free `openrouter/free` router. Three environment variables control the
provider entirely — swapping to Ollama or a paid provider means changing only these:

\`\`\`
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your_key_here
LLM_MODEL=openrouter/free
\`\`\`

Nothing else in the code needs to change — this is the whole point of using an OpenAI-compatible
client library rather than a provider-specific SDK.

## Stub mode and the kill switch

- `LLM_STUB=1` — skips the model entirely, returns a fixed valid response. Used during development so
  restarting the server never spends a real call.
- `LLM_ENABLED=false` — returns a `503` immediately, no model call made. This is the switch someone
  would flip in production if the provider goes down or the bill spikes.

## Eval results

**Score: 8/8** (Aug 14, 2026, prompt version `enrich-v1`)

Ran via `node evals/run-eval.js` against 8 hand-labelled cases covering clear fiction, nonfiction,
childrens, an ambiguous case with no description, and a case with a suspicious price. All 8 categories
matched their expected label.

## Cost

One call during testing: 565 input tokens, 152 output tokens, ~9 seconds. On OpenRouter's free tier
this costs nothing, but for a rough estimate on a paid model at roughly $0.15 per million input tokens
and $0.60 per million output tokens (a typical small-model rate): a single call costs a fraction of a
cent. At 10,000 requests a day, that's roughly $6-8/day depending on the model — the real driver of
cost at that volume would be output tokens and the occasional repair retry doubling a call.

## What I'd fix with another day

The repair retry currently doesn't distinguish between a parse failure (malformed JSON) and a
validation failure (valid JSON, wrong values) in how it messages the model — a more targeted repair
prompt for each failure type would likely improve the repair success rate. I'd also move
`logCost`/`callModel` out of the route handler so they're defined once, not redefined per request.