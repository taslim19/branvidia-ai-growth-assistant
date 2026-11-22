import type { BusinessProfile, PhotoItem, PhotoType, Review } from "@/types";
import type {
  PhotoAnalysisResult,
  ProfileAuditResult,
  ReviewAnalysisResult,
  ReviewRepliesResult,
  SentimentLabel,
  SynthesisResult,
} from "../analysis/schemas";

/**
 * Deterministic template generator. When no LLM_API_KEY is set, these
 * rule-based generators produce the same structured outputs the LLM would,
 * so the whole app works end to end with zero credentials. Everything here
 * is a pure function of the input data: no randomness, no network.
 */

const ALL_PHOTO_TYPES: PhotoType[] = ["food", "drink", "interior", "exterior", "team", "menu"];

const PHOTO_TYPE_IDEAS: Record<PhotoType, string> = {
  food: "Your best-selling dish, plated and shot in daylight near a window.",
  drink: "The signature drink being made - pouring or latte art in progress.",
  interior: "The interior at opening time: seating, counter and light, so visitors know what to expect.",
  exterior: "A bright shot of the entrance and signboard, so first-time visitors recognise the place from the road.",
  team: "A team member at work. Reviewers mention staff by name, so show the people behind the counter.",
  menu: "A clear, well-lit photo of the full menu board, updated whenever prices change.",
};

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function missingDays(profile: BusinessProfile): string[] {
  return profile.hours.filter((h) => h.open === null).map((h) => h.day);
}

export function profileAuditTemplate(profile: BusinessProfile): ProfileAuditResult {
  const result: ProfileAuditResult = { problems: [], suggestions: [] };
  const days = missingDays(profile);
  if (days.length > 0) {
    result.problems.push({
      title: `${days.length === 7 ? "Opening" : `${days.join(" and ")} opening`} hours are missing`,
      detail: `${days.join(", ")} ${days.length === 1 ? "is" : "are"} not set, so Google shows ` +
        "\u201cHours might differ\u201d exactly when nearby searches peak. Wrong or missing hours directly cost visits.",
      severity: "high",
    });
    result.suggestions.push({
      title: "Add the missing opening hours today",
      detail:
        "Set real hours for every day, including closed days. Accurate hours remove the warning and match what reviewers already ask about.",
      impact: "high",
      effort: "quick win",
    });
  }
  if (!profile.websiteUrl || !profile.menuUrl) {
    const both = !profile.websiteUrl && !profile.menuUrl;
    result.problems.push({
      title: both ? "No website or menu link" : profile.websiteUrl ? "No menu link" : "No website link",
      detail:
        "Searchers comparing options see competitors\u2019 Website and Menu buttons. " +
        `${profile.name} shows ${both ? "neither" : "only one"}, which costs clicks at the decision moment.`,
      severity: "high",
    });
    result.suggestions.push({
      title: "Add a website and menu link",
      detail:
        "Even a one-page site with the menu, hours and a call button works. Link the menu URL separately so the Menu button appears on the profile.",
      impact: "high",
      effort: "moderate",
    });
  }
  const words = wordCount(profile.description);
  if (words < 30) {
    result.problems.push({
      title: `Description is ${words} words`,
      detail:
        "The description says almost nothing about what makes the business worth visiting: no specialities, no neighbourhood character, no reason to choose it.",
      severity: words < 10 ? "medium" : "low",
    });
    result.suggestions.push({
      title: "Rewrite the description to about 90-120 words",
      detail: `Lead with what ${profile.name} is known for, name the neighbourhood, and say what a first-timer should try. Plain words, no slogans.`,
      impact: "medium",
      effort: "quick win",
    });
  }
  const unsetAttributes = profile.attributes.filter((a) => !a.set).map((a) => a.label);
  if (unsetAttributes.length > 0) {
    result.problems.push({
      title: "Business attributes are not set",
      detail: `${unsetAttributes.join(", ")} ${unsetAttributes.length === 1 ? "is" : "are"} unset. These feed filters, so unset means invisible in filtered searches.`,
      severity: "low",
    });
    result.suggestions.push({
      title: "Set the business attributes",
      detail: `Mark ${unsetAttributes.join(", ").toLowerCase()} accurately. Each one is a filter the business can appear in.`,
      impact: "medium",
      effort: "quick win",
    });
  }
  return result;
}

const THEME_RULES: { label: string; pattern: RegExp }[] = [
  { label: "Coffee quality", pattern: /coffee|espresso|latte|cold brew|filter/i },
  { label: "Slow service at peak hours", pattern: /wait|slow|minutes|rush|understaffed/i },
  { label: "Limited seating", pattern: /seat|table|crowd/i },
  { label: "Unreliable Wi-Fi", pattern: /wi-?fi|internet/i },
  { label: "Hard to find or closed-day confusion", pattern: /find|entrance|board|shutters|closed|hours/i },
  { label: "Friendly staff", pattern: /staff|barista|team|warm|friendly/i },
  { label: "Desserts and bakes", pattern: /cake|croissant|banoffee|dessert|bake|pie|sandwich|pastry/i },
  { label: "Ambience and seating", pattern: /ambience|music|playlist|calm|quiet|cozy|corner/i },
];

export function classifySentiment(rating: number): SentimentLabel {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}

export function reviewAnalysisTemplate(
  _profile: BusinessProfile,
  reviews: Review[],
): ReviewAnalysisResult {
  return {
    reviewSentiments: reviews.map((review) => ({
      reviewId: review.id,
      sentiment: classifySentiment(review.rating),
      themes: THEME_RULES.filter((rule) => rule.pattern.test(review.text))
        .slice(0, 3)
        .map((rule) => rule.label),
    })),
  };
}

export function photoAnalysisTemplate(photos: PhotoItem[]): PhotoAnalysisResult {
  const present = new Set(photos.map((p) => p.type));
  const missing = ALL_PHOTO_TYPES.filter((t) => !present.has(t));
  return { contentIdeas: missing.map((t) => PHOTO_TYPE_IDEAS[t]) };
}

export function synthesisTemplate(input: {
  profile: BusinessProfile;
  audit: ProfileAuditResult;
  reviewAnalysis: ReviewAnalysisResult;
  complaintThemes: { label: string; count: number }[];
  photoMissing: PhotoType[];
}): SynthesisResult {
  const { profile, audit, complaintThemes, photoMissing } = input;
  const problems = [...audit.problems];
  const suggestions = [...audit.suggestions];

  const topComplaint = complaintThemes[0];
  if (topComplaint) {
    problems.push({
      title: `${topComplaint.label} is a pattern in reviews`,
      detail: `${topComplaint.count} review${topComplaint.count === 1 ? "" : "s"} mention${topComplaint.count === 1 ? "s" : ""} this, and negative reviews without replies are the first thing a careful searcher reads.`,
      severity: "medium",
    });
    suggestions.push({
      title: "Reply to the unanswered reviews",
      detail:
        "A calm, specific reply shows the next hundred readers the business listens. Drafts are in the report; adjust names and tone so they sound like you.",
      impact: "high",
      effort: "quick win",
    });
  }

  if (photoMissing.length > 0) {
    problems.push({
      title: "Photos show only part of the business",
      detail: `No ${photoMissing.join(", ")} shots. Searchers cannot see the space, the entrance or the menu before deciding.`,
      severity: "medium",
    });
    suggestions.push({
      title: `Add ${photoMissing.length} photo type${photoMissing.length === 1 ? "" : "s"} this week`,
      detail: `${photoMissing.map((t) => t[0].toUpperCase() + t.slice(1)).join(", ")}. Phone photos in daylight are fine; use the shot ideas in Photo Insights.`,
      impact: "medium",
      effort: "quick win",
    });
  }

  suggestions.push({
    title: "Ask happy regulars for a review",
    detail:
      "A small card at the counter with the review link turns goodwill into visible proof. Never offer rewards for reviews.",
    impact: "medium",
    effort: "moderate",
  });

  const nextSteps = [
    audit.problems.some((p) => p.title.includes("hours"))
      ? {
          title: "Set the missing opening hours and attributes",
          detail: "Ten minutes in the profile editor. Removes the hours warning immediately.",
          timeframe: "Today",
        }
      : {
          title: "Set the business attributes",
          detail: "Each attribute is a filter the profile can appear in.",
          timeframe: "Today",
        },
    {
      title: "Post the review replies",
      detail: "Use the drafts in this report, adjusted so they sound like you.",
      timeframe: "Today",
    },
    photoMissing.length > 0
      ? {
          title: `Shoot and upload the ${photoMissing.length} missing photo types`,
          detail: `${photoMissing.join(", ")}. Phone photos in daylight are fine.`,
          timeframe: "This week",
        }
      : {
          title: "Refresh the photo set",
          detail: "Retire stale shots and add recent ones in daylight.",
          timeframe: "This week",
        },
    !profile.websiteUrl || !profile.menuUrl
      ? {
          title: "Publish the website and menu link",
          detail: "A one-page site or even a hosted menu PDF is enough to unlock both buttons.",
          timeframe: "Within 2 weeks",
        }
      : {
          title: "Rewrite the description",
          detail: "Say what the business is known for and what to try first.",
          timeframe: "Within 2 weeks",
        },
    {
      title: "Re-run this analysis",
      detail: "Check whether the score moves once hours, photos and replies are in.",
      timeframe: "In 3-4 weeks",
    },
  ];

  return { problems, suggestions, nextSteps };
}

function excerpt(text: string, max = 90): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}\u2026`;
}

export function reviewRepliesTemplate(
  businessName: string,
  reviews: Review[],
  analysis: ReviewAnalysisResult,
): ReviewRepliesResult {
  const sentimentById = new Map(analysis.reviewSentiments.map((s) => [s.reviewId, s.sentiment]));
  const unanswered = reviews.filter((r) => !r.replied);
  // Negative reviews first (they need the most care), then a positive one.
  const ordered = [...unanswered].sort((a, b) => a.rating - b.rating || b.date.localeCompare(a.date));
  const picked = ordered.slice(0, 3);
  const drafts = picked.map((review) => {
    const sentiment = sentimentById.get(review.id) ?? classifySentiment(review.rating);
    const draft =
      sentiment === "negative"
        ? `${review.author}, thank you for the specifics - you are right to call this out, and we are sorry. ` +
          "This is not the experience we want anyone to have, and we are looking at what went wrong on our side. " +
          "We would welcome the chance to do better next time.\n\n" +
          `The ${businessName} team`
        : sentiment === "neutral"
          ? `${review.author}, thank you for the honest review. ` +
            "We are glad parts of the visit worked, and we hear you on what fell short - we are on it. " +
            "We hope the next visit earns the full five stars.\n\n" +
            `The ${businessName} team`
          : `Thank you, ${review.author}! ` +
            "We are glad the visit was worth it, and comments like yours keep the team going. " +
            "See you again soon.\n\n" +
            `The ${businessName} team`;
    return {
      reviewId: review.id,
      author: review.author,
      rating: review.rating,
      reviewExcerpt: excerpt(review.text),
      draft,
    };
  });
  return { drafts };
}
