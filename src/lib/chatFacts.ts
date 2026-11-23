// Fixed fact sheet for questions asked mid-chat. Answers are deterministic
// (no model call), so they cannot drift from what the app really does, and
// replaying a saved session always reproduces the same transcript.

export interface FactAnswer {
  text: string;
  quickReplies: string[];
}

const TOPIC_CHIPS = ["What data do you access?", "Is it safe?", "What's in the report?", "How is the score worked out?"];

// A question mark, or a common question form about the assistant, the data or
// the report. Intake answers that merely start with a question word ("How to
// get more customers") are not swallowed: the wh-forms need "you/your/it/this".
const QUESTION_FORMS: RegExp[] = [
  /^\s*(what|why|how|who|where|when|which)\b.*\b(you|your|it|this|that)\b/i,
  /^\s*(is|are|do|does|can|could|will|would|should)\s+(you|it|this|that|the|my data|google|branvi)\b/i,
  /^\s*(tell me|explain)\b/i,
];

export function isQuestion(input: string): boolean {
  return input.includes("?") || QUESTION_FORMS.some((re) => re.test(input));
}

// Short form of each intake question, used when resuming after an answer.
export const RESUME_PROMPTS: Record<string, string> = {
  name: "what’s your business called?",
  category: "what kind of business is it?",
  productsServices: "what do you mainly sell or offer?",
  targetCustomers: "who are your usual customers?",
  goals: "what would you like more of in the next few months?",
};

export function isKeepCurrent(input: string): boolean {
  return input.trim().toLowerCase() === "keep current";
}

export function isEditRequest(input: string): boolean {
  return /^\s*(edit|change|fix|correct|update)\b.{0,30}$/i.test(input) && /\b(edit|change|fix|correct|update)\b/i.test(input)
    && /\b(answers?|details?|info|information|business|them|that|it)\b/i.test(input);
}

interface Rule {
  test: RegExp;
  text: string;
}

const RULES: Rule[] = [
  {
    test: /\b(data|access|permission|permissions|read|see|share|collect|scope|scopes|connect)\b/i,
    text:
      "Signing in with Google asks only for basic identity details: your name, email address and profile picture. " +
      "I don't ask for your business data, and I can't post or change anything on Google. " +
      "Google hasn't approved Business Profile API access for this project yet, so the report is built from a realistic sample profile with sample reviews and photos, and the report says so.",
  },
  {
    test: /\b(safe|secure|security|privacy|private|trust|store|stored|token|password|delete|disconnect)\b/i,
    text:
      "Sign-in tokens are kept on the server, encrypted, and the browser only gets a protected session cookie. I never see your Google password. " +
      "Connecting is optional and you can disconnect at any time.",
  },
  {
    test: /\b(score|scoring|rating|calculated|worked out|points)\b/i,
    text:
      "The overall score is calculated in code, not guessed by the AI. It weighs your profile (35%), reviews (30%), photos (20%) and how often reviews get replies (15%).",
  },
  {
    test: /\b(report|include|included|get|receive|result|results|insight|insights|recommend|recommendations)\b/i,
    text:
      "The report covers a business overview, a profile review, customer review insights, photo insights, problems found, AI optimization suggestions, suggested review replies and next steps, with an overall score.",
  },
  {
    test: /\b(optional|skip|have to|need to|must|required|without google)\b/i,
    text:
      "Connecting Google is optional. You can skip it and I'll still give you three practical tips based on your answers.",
  },
  {
    test: /\b(photo|photos|picture|pictures|image|images)\b/i,
    text:
      "Photo insights look at which kinds of photos the profile has (like entrance, interior, team, menu) and which are missing. I don't look at the image pixels.",
  },
  {
    test: /\b(repl(y|ies)|respond|responses|post|publish)\b/i,
    text:
      "Suggested review replies are drafts for you to copy. I never post anything to Google.",
  },
  {
    test: /\b(who|what are you|are you|bot|human|ai)\b/i,
    text:
      "I'm Branvi, Branvidia's AI growth assistant. I ask a few questions about your business, then build a Google Business Profile report with recommendations.",
  },
  {
    test: /\b(why|need|ask|asking)\b/i,
    text:
      "Your answers help me tailor the recommendations to your kind of business, your customers and your goals.",
  },
  {
    test: /\b(price|pricing|cost|free|pay|paid|charge|fee)\b/i,
    text:
      "I don't have pricing details. For Branvidia's services, please contact the Branvidia team directly.",
  },
];

export function answerQuestion(input: string): FactAnswer {
  for (const rule of RULES) {
    if (rule.test.test(input)) return { text: rule.text, quickReplies: TOPIC_CHIPS };
  }
  return {
    text:
      "I don't have a good answer to that one. I can explain what data I access, how it's kept safe, what's in the report, or how the score works.",
    quickReplies: TOPIC_CHIPS,
  };
}
