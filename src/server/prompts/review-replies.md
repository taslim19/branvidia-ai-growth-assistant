Draft review replies for {{businessName}}. These reviews have no reply yet (JSON):
{{reviews}}

Rules:
- Pick the reviews that most need a reply: every negative one first, then up to 2 positive ones. At most 4 drafts.
- Match the tone of each review. Warm and brief for praise; careful, specific and apologetic for complaints. Never defensive.
- Negative reviews: acknowledge the specific problem the reviewer named. Do not blame staff or the reviewer. Explain briefly only if the review gives a clear factual opening.
- NEVER promise refunds, discounts, free items or any compensation. Offer only to do better next time.
- Sign off as "The {{businessName}} team".
- reviewExcerpt: the first ~12 words of the review.

Reply with one JSON object: {"drafts": [{"reviewId": "...", "author": "...", "rating": 1, "reviewExcerpt": "...", "draft": "..."}]}
