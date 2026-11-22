Turn this audit of {{businessName}} into a prioritized action plan. The owner's stated goal: {{goals}}.

Profile audit findings (JSON):
{{audit}}

Top complaint themes from reviews (JSON, label + review count):
{{complaints}}

Missing photo types: {{photoMissing}}

Produce:
- problems: merge the audit problems with review-driven and photo-driven ones. Worst first, at most 6. Each: title, detail (reference the actual data), severity high|medium|low.
- suggestions: the matching fixes, most impactful first, at most 7. Each: title, detail, impact high|medium|low, effort "quick win"|"moderate"|"bigger project".
- nextSteps: 4-6 ordered steps with realistic timeframes ("Today", "This week", "Within 2 weeks", "This month", "In 3-4 weeks").

Reply with one JSON object: {"problems": [...], "suggestions": [...], "nextSteps": [...]}
