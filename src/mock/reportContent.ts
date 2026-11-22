import type {
  Report,
  PhotoInsights,
  Problem,
  Suggestion,
  ReviewReplyDraft,
  NextStep,
  BusinessInfo,
  BusinessProfile,
} from "@/types";
import { MOCK_PROFILES } from "./businessProfile";
import { UNANSWERED_REVIEWS, UNANSWERED_REVIEWS_KORAMANGALA } from "./reviews";
import { MOCK_PHOTOS } from "./photos";

// Stable id for the curated sample report linked from the landing page.
export const REPORT_ID = "brew-and-bean-2026-11-21";

export const MOCK_PHOTO_INSIGHTS: PhotoInsights = {
  present: ["food", "drink"],
  missing: ["interior", "exterior", "team", "menu"],
  contentIdeas: [
    "A bright shot of the entrance and signboard, so first-time visitors recognise the café from the road.",
    "The interior at opening time: empty tables, counter and seating, to show the calm workspace reviewers mention.",
    "A barista pouring latte art or pulling an espresso shot. Reviewers praise the baristas by name, so show them.",
    "A clear, well-lit photo of the full menu board, updated whenever prices change.",
    "The Saturday morning crowd (with permission) to set honest expectations about peak hours.",
  ],
};

const PROBLEMS_INDIRANAGAR: Problem[] = [
  {
    title: "Weekend hours are missing",
    detail:
      "Saturday and Sunday hours are not set, so Google shows “Hours might differ” exactly when café searches peak. Sanjay’s review even mentions Sunday opening times.",
    severity: "high",
  },
  {
    title: "No website or menu link",
    detail:
      "Searchers comparing cafés see competitors’ Website and Menu buttons. Brew & Bean shows neither, which costs clicks at the decision moment.",
    severity: "high",
  },
  {
    title: "Slow service at peak hours is a pattern",
    detail:
      "7 of 30 reviews mention slow service on weekend mornings or lunch rush, and the negative ones are unanswered. The complaint is fixable and visible.",
    severity: "medium",
  },
  {
    title: "Photos show only food and drinks",
    detail:
      "All 6 photos are food or drink. There is no exterior shot (Deepak’s review says the café is hard to spot), no interior, no team, no menu.",
    severity: "medium",
  },
  {
    title: "Description is 12 words",
    detail:
      "The description says almost nothing about what makes the café worth visiting: no specialities, no neighbourhood character, no reason to choose it.",
    severity: "low",
  },
  {
    title: "Business attributes are not set",
    detail:
      "Wi-Fi, outdoor seating, vegetarian options and parking are unset. These feed filters, so unset means invisible in filtered searches.",
    severity: "low",
  },
];

const PROBLEMS_KORAMANGALA: Problem[] = [
  {
    title: "Tuesday, Saturday and Sunday hours are missing",
    detail:
      "Varun walked 15 minutes to a closed café on a Tuesday because nothing online says it is closed. Wrong or missing hours directly cost visits.",
    severity: "high",
  },
  {
    title: "No website or menu link",
    detail:
      "Searchers comparing cafés see competitors’ Website and Menu buttons. This location shows neither.",
    severity: "high",
  },
  {
    title: "The description is three words",
    detail: "“Coffee and more” tells customers and search nothing about the place.",
    severity: "medium",
  },
  {
    title: "Wi-Fi complaints are unanswered",
    detail:
      "Aditya’s review names dropping Wi-Fi during calls. This location attracts laptop workers, so connectivity is part of the product.",
    severity: "medium",
  },
  {
    title: "Photos show only food and drinks",
    detail: "All 6 photos are food or drink. No interior, exterior, team or menu shots.",
    severity: "medium",
  },
  {
    title: "Business attributes are not set",
    detail:
      "Wi-Fi, outdoor seating, vegetarian options and parking are unset. These feed filters, so unset means invisible in filtered searches.",
    severity: "low",
  },
];

export const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    title: "Add the missing opening hours today",
    detail:
      "Set real hours for every day, including closed days. If Sunday opens later, say so. Reviewers are already asking, and accurate hours remove the “might differ” warning.",
    impact: "high",
    effort: "quick win",
  },
  {
    title: "Add a website and menu link",
    detail:
      "Even a one-page site with the menu, hours and a call button works. Link the menu URL separately so the Menu button appears on the profile.",
    impact: "high",
    effort: "moderate",
  },
  {
    title: "Reply to the unanswered reviews",
    detail:
      "Unanswered reviews, especially negative ones, are the first thing a careful searcher reads. A calm, specific reply shows the next hundred readers the café listens. Drafts are below.",
    impact: "high",
    effort: "quick win",
  },
  {
    title: "Add 4 photo types this week",
    detail:
      "Exterior, interior, team and menu. Use the shot ideas in Photo Insights. Right now every photo is food or drink, so searchers can’t see the space, the entrance or the menu.",
    impact: "medium",
    effort: "quick win",
  },
  {
    title: "Rewrite the description to about 90-120 words",
    detail:
      "Lead with filter coffee and fresh bakes, name the neighbourhood, mention work-friendly seating and what first-timers should try. Plain words, no slogans.",
    impact: "medium",
    effort: "quick win",
  },
  {
    title: "Set the business attributes",
    detail:
      "Mark Wi-Fi, outdoor seating, vegetarian options and parking accurately. Each one is a filter the café can appear in.",
    impact: "medium",
    effort: "quick win",
  },
  {
    title: "Fix the peak-hour bottleneck",
    detail:
      "7 reviews name slow weekend-morning service. Options: a second person on the espresso machine 8-11 am, a pickup counter for simple orders, or a board setting honest wait times.",
    impact: "high",
    effort: "bigger project",
  },
  {
    title: "Ask happy regulars for a review",
    detail:
      "A small card at the counter with the review link turns goodwill into visible proof. Never offer rewards for reviews.",
    impact: "medium",
    effort: "moderate",
  },
];

const DRAFTS_INDIRANAGAR: ReviewReplyDraft[] = [
  {
    reviewId: "rev-02",
    author: "Rohit M",
    rating: 2,
    reviewExcerpt:
      "Coffee is genuinely good but we waited 25 minutes for two cappuccinos on a Saturday morning…",
    draft:
      "Rohit, thank you for saying the coffee itself is good, and you are right about the wait. A 25-minute wait is not what we want for anyone, and we are sorry. We would welcome the chance to serve you faster next time.\n\nThe Brew & Bean team",
  },
  {
    reviewId: "rev-06",
    author: "Arjun T",
    rating: 1,
    reviewExcerpt:
      "Waited 30 minutes for a sandwich during lunch rush and it arrived cold…",
    draft:
      "Arjun, a 30-minute wait and a cold sandwich is not the experience we want anyone to have, and we are sorry. Thank you for telling us exactly what happened. We would welcome the chance to get it right next time.\n\nThe Brew & Bean team",
  },
  {
    reviewId: "rev-12",
    author: "Nikhil D",
    rating: 2,
    reviewExcerpt:
      "Ordered at the counter at 8 am, food came at 8:40. Slow service ruined a quick breakfast plan.",
    draft:
      "Nikhil, thank you for the specifics. An 8 am order should be quick, and 40 minutes is far too long. We are sorry this cost you your breakfast plan. Glad the coffee held up; we owe you a faster visit next time.\n\nThe Brew & Bean team",
  },
];

const DRAFTS_KORAMANGALA: ReviewReplyDraft[] = [
  {
    reviewId: "rev-k02",
    author: "Varun S",
    rating: 2,
    reviewExcerpt:
      "Walked 15 minutes here on a Tuesday afternoon and found the shutters down…",
    draft:
      "Varun, that is a wasted trip and we are sorry. You are right that our closed day was not shown where you would have seen it. We hope you will give us another try on a day we are open.\n\nThe Brew & Bean team",
  },
  {
    reviewId: "rev-k03",
    author: "Priya L",
    rating: 4,
    reviewExcerpt: "Cozy spot, friendly staff. The banoffee pie was great.",
    draft:
      "Thank you, Priya! The banoffee has a loyal following and we are glad it earned yours. See you again soon.\n\nThe Brew & Bean team",
  },
  {
    reviewId: "rev-k04",
    author: "Aditya R",
    rating: 3,
    reviewExcerpt:
      "Coffee is fine but the Wi-Fi kept dropping during my calls…",
    draft:
      "Aditya, thank you for flagging this. Dropped calls are exactly what our work-corner regulars cannot afford, and we are sorry the connection let you down. We would welcome a retest on your next visit.\n\nThe Brew & Bean team",
  },
];

const NEXT_STEPS_INDIRANAGAR: NextStep[] = [
  {
    title: "Set weekend hours and business attributes",
    detail: "Ten minutes in the profile editor. Removes the hours warning immediately.",
    timeframe: "Today",
  },
  {
    title: "Post the three review replies",
    detail: "Use the drafts above, adjust the names and tone so they sound like you.",
    timeframe: "Today",
  },
  {
    title: "Shoot and upload the 4 missing photo types",
    detail: "Exterior, interior, team and menu. Phone photos in daylight are fine.",
    timeframe: "This week",
  },
  {
    title: "Publish the new description and menu link",
    detail: "A one-page site or even a hosted menu PDF is enough to unlock both buttons.",
    timeframe: "Within 2 weeks",
  },
  {
    title: "Staff the weekend-morning rush",
    detail: "Second barista 8-11 am on Saturday and Sunday; watch wait-time mentions in new reviews.",
    timeframe: "This month",
  },
  {
    title: "Re-run this analysis",
    detail: "Check whether the score moves once hours, photos and replies are in.",
    timeframe: "In 3-4 weeks",
  },
];

const NEXT_STEPS_KORAMANGALA: NextStep[] = [
  {
    title: "Set the missing hours, including the Tuesday closure",
    detail: "One reviewer already made a wasted trip. Accurate hours prevent the next one.",
    timeframe: "Today",
  },
  {
    title: "Post the three review replies",
    detail: "Use the drafts above, adjust the names and tone so they sound like you.",
    timeframe: "Today",
  },
  {
    title: "Rewrite the three-word description",
    detail: "Say what the café is known for, where it sits in Koramangala, and what to try first.",
    timeframe: "This week",
  },
  {
    title: "Shoot and upload the 4 missing photo types",
    detail: "Exterior, interior, team and menu. Phone photos in daylight are fine.",
    timeframe: "This week",
  },
  {
    title: "Check the Wi-Fi during peak laptop hours",
    detail: "Run calls and speed checks between 2 and 6 pm; upgrade the plan or router if it drops.",
    timeframe: "Within 2 weeks",
  },
  {
    title: "Re-run this analysis",
    detail: "Check whether the score moves once hours, photos and replies are in.",
    timeframe: "In 3-4 weeks",
  },
];

export interface BuildReportOptions {
  locationId?: string;
  intake?: Partial<BusinessInfo>;
  /** Fixed id for the curated sample; otherwise a unique id is generated. */
  fixedId?: string;
}

export function buildMockReport(options: BuildReportOptions = {}): Report {
  const locationId = options.locationId ?? "loc-indiranagar";
  const profile: BusinessProfile = MOCK_PROFILES[locationId] ?? MOCK_PROFILES["loc-indiranagar"];
  const isIndiranagar = locationId === "loc-indiranagar";
  const intake = options.intake ?? {};

  const unanswered = isIndiranagar ? UNANSWERED_REVIEWS : UNANSWERED_REVIEWS_KORAMANGALA;

  const business: BusinessInfo = {
    name: intake.name?.trim() || profile.name,
    category: intake.category?.trim() || profile.category,
    productsServices:
      intake.productsServices?.trim() ||
      "Filter coffee, espresso drinks, fresh bakes and desserts",
    targetCustomers:
      intake.targetCustomers?.trim() ||
      (isIndiranagar
        ? "Office workers, students and weekend brunch crowds in Indiranagar"
        : "Students and laptop workers in Koramangala"),
    goals: intake.goals?.trim() || "More weekend footfall and more regulars",
  };

  return {
    id: options.fixedId ?? `rpt-${locationId}-${Date.now()}`,
    dataSource: "mock",
    source: "template",
    businessName: business.name,
    createdAt: new Date().toISOString(),
    // Overall score must equal the weighted sub-scores (35/30/20/15):
    // Indiranagar 50.9 -> 51, Koramangala 43.8 -> 44.
    score: isIndiranagar ? 51 : 44,
    breakdown: isIndiranagar
      ? { profile: 48, reviews: 62, photos: 55, engagement: 30 }
      : { profile: 38, reviews: 55, photos: 55, engagement: 20 },
    overview: { business, profile },
    reviewInsights: {
      sentiment: isIndiranagar
        ? { positive: 20, neutral: 4, negative: 6 }
        : { positive: 8, neutral: 2, negative: 4 },
      totalReviews: profile.reviewCount,
      positiveThemes: isIndiranagar
        ? [
            { label: "Coffee quality", count: 14 },
            { label: "Ambience and seating", count: 9 },
            { label: "Desserts and bakes", count: 6 },
          ]
        : [
            { label: "Coffee quality", count: 6 },
            { label: "Calm workspace", count: 4 },
            { label: "Desserts and bakes", count: 3 },
          ],
      complaints: isIndiranagar
        ? [
            { label: "Slow service at peak hours", count: 7 },
            { label: "Limited seating on weekends", count: 3 },
            { label: "Hard to find from the road", count: 2 },
          ]
        : [
            { label: "Closed-day confusion", count: 3 },
            { label: "Unreliable Wi-Fi", count: 2 },
          ],
      replyRatePercent: isIndiranagar ? 17 : 14,
      repliedCount: isIndiranagar ? 5 : 2,
      unansweredReviews: unanswered,
    },
    photoInsights: MOCK_PHOTO_INSIGHTS,
    photos: MOCK_PHOTOS,
    problems: isIndiranagar ? PROBLEMS_INDIRANAGAR : PROBLEMS_KORAMANGALA,
    suggestions: MOCK_SUGGESTIONS,
    replyDrafts: isIndiranagar ? DRAFTS_INDIRANAGAR : DRAFTS_KORAMANGALA,
    nextSteps: isIndiranagar ? NEXT_STEPS_INDIRANAGAR : NEXT_STEPS_KORAMANGALA,
  };
}
