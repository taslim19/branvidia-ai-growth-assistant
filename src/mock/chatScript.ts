import type { BusinessInfo } from "@/types";

// Scripted questions for the chat intake. The assistant asks one question
// at a time; each entry knows its quick-reply chips (if any).
export interface ChatQuestion {
  key: keyof BusinessInfo;
  ask: string;
  quickReplies: string[];
}

export const CHAT_QUESTIONS: ChatQuestion[] = [
  {
    key: "name",
    ask: "Hi, I’m Branvi, Branvidia’s growth assistant. Let’s look at how your business shows up on Google. First, what’s your business called?",
    quickReplies: ["Brew & Bean Café", "Lotus Bakery"],
  },
  {
    key: "category",
    ask: "Nice to meet {name}. What kind of business is it?",
    quickReplies: ["Café", "Salon", "Restaurant"],
  },
  {
    key: "productsServices",
    ask: "What do you mainly sell or offer?",
    quickReplies: ["Coffee, brunch, desserts", "Haircuts and styling", "Home services"],
  },
  {
    key: "targetCustomers",
    ask: "Who are your usual customers?",
    quickReplies: ["Students and young professionals", "Families", "Walk-ins nearby"],
  },
  {
    key: "goals",
    ask: "Last one: what would you like more of in the next few months?",
    quickReplies: ["More foot traffic", "Better reviews", "Rank higher on Google Maps"],
  },
];

export function fillTemplate(template: string, info: Partial<BusinessInfo>): string {
  return template.replace("{name}", info.name ? `the ${info.name} team` : "there");
}

export function buildSummaryText(info: BusinessInfo): string {
  return `Here’s what I understood about ${info.name}.`;
}

export function buildSummaryRows(info: BusinessInfo): { label: string; value: string }[] {
  return [
    { label: "Business", value: info.name },
    { label: "Category", value: info.category },
    { label: "Offers", value: info.productsServices },
    { label: "Customers", value: info.targetCustomers },
    { label: "Goal", value: info.goals },
  ];
}

// Three general tips built from the typed answers, used when the owner
// skips the Google connection.
export function buildGeneralTips(info: BusinessInfo): string[] {
  return [
    `Write your ${info.category.toLowerCase()} description for the customer who is choosing right now: what ${info.productsServices.split(",")[0].toLowerCase().trim()} you’re known for, where you are, and what a first-timer should try.`,
    `Ask your happiest ${info.targetCustomers.split(" ")[0].toLowerCase()} customers for a Google review this week. A short card at the counter with your review link is enough. Never offer rewards for reviews.`,
    `Add 4 kinds of photos: your entrance, your space, your team, and your menu. Take them in daylight and refresh them whenever the space or menu changes.`,
  ];
}

export const OPT_IN_MESSAGE =
  "To go further, you can sign in with Google and I’ll build a specific report covering profile details, reviews and photos. Google hasn’t approved live Business Profile access for this project yet, so that part uses a sample profile. Here’s exactly what that means before you decide.";

export const SKIP_REPLY =
  "No problem, the Google connection is optional. Here are 3 things you can do from what you told me.";

export const CONNECT_LATER_NOTE =
  "If you’d like the full report later, just ask to connect Google.";

export const CANCELLED_MESSAGE =
  "Nothing was connected. You cancelled on the Google screen, so no data was shared. Would you like to connect now, or keep going without it?";
