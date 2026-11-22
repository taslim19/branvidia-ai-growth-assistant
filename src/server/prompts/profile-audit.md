Audit this Google Business Profile. Find the profile-field problems that cost the business customers, and the fixes.

Business data (JSON):
{{business}}

Rules:
- Only audit profile fields: description, hours, website/menu links, phone, category, attributes, photo coverage. Reviews and photos-by-type are handled elsewhere.
- Each problem: plain title, one or two sentences of detail naming the actual data, severity high|medium|low.
- Each suggestion: title, detail, impact high|medium|low, effort "quick win"|"moderate"|"bigger project".
- At most 6 problems and 6 suggestions, worst first.
- No invented facts: only what the data shows.

Reply with one JSON object: {"problems": [...], "suggestions": [...]}
