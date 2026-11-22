Analyze these Google reviews for {{businessName}}.

Reviews (JSON array of {"id", "rating", "text"}):
{{reviews}}

For EVERY review id, return:
- reviewId: the exact id
- sentiment: "positive" (4-5 stars), "neutral" (3 stars) or "negative" (1-2 stars). The text can override the rating when they clearly disagree.
- themes: up to 3 short theme labels (2-4 words each) describing what the review is about, e.g. "Coffee quality", "Slow service at peak hours", "Friendly staff". Reuse the same label for the same theme across reviews so they can be counted.

Reply with one JSON object: {"reviewSentiments": [{"reviewId": "...", "sentiment": "...", "themes": [...]}]}
Do not count anything; counts are computed in code.
