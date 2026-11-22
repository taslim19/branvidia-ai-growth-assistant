import type { Review } from "@/types";

// The profile reports 30 reviews in total. The 12 most recent are kept here;
// the report's aggregates cover all 30.
export const MOCK_REVIEWS: Review[] = [
  {
    id: "rev-01",
    author: "Ananya S",
    rating: 5,
    date: "2026-11-16",
    text: "The filter coffee is the best on 100 Feet Road. Quiet corners to work from, and the staff remember my order.",
    replied: true,
    replyText: "Thank you, Ananya! See you at your usual corner table.",
  },
  {
    id: "rev-02",
    author: "Rohit M",
    rating: 2,
    date: "2026-11-14",
    text: "Coffee is genuinely good but we waited 25 minutes for two cappuccinos on a Saturday morning. By the time they arrived we had to leave. This is the second time peak-hour service has been this slow.",
    replied: false,
  },
  {
    id: "rev-03",
    author: "Farhana K",
    rating: 5,
    date: "2026-11-12",
    text: "Croissants are flaky and fresh. Lovely ambience for a quiet read.",
    replied: true,
    replyText: "So glad you enjoyed them, Farhana!",
  },
  {
    id: "rev-04",
    author: "Deepak V",
    rating: 3,
    date: "2026-11-10",
    text: "Decent coffee, but finding the place is hard. No board outside and the entrance looks closed from the road.",
    replied: false,
  },
  {
    id: "rev-05",
    author: "Meera J",
    rating: 4,
    date: "2026-11-08",
    text: "Great cold brew and the chocolate cake is worth the trip. Gets crowded after 6 pm.",
    replied: false,
  },
  {
    id: "rev-06",
    author: "Arjun T",
    rating: 1,
    date: "2026-11-05",
    text: "Waited 30 minutes for a sandwich during lunch rush and it arrived cold. Staff were apologetic but clearly understaffed at peak hours.",
    replied: false,
  },
  {
    id: "rev-07",
    author: "Lakshmi N",
    rating: 5,
    date: "2026-11-02",
    text: "My go-to for client meetings. Calm, good music, strong coffee.",
    replied: true,
    replyText: "Always a pleasure hosting your meetings, Lakshmi.",
  },
  {
    id: "rev-08",
    author: "Sanjay P",
    rating: 4,
    date: "2026-10-29",
    text: "Solid espresso. Wish they opened earlier on Sundays for a pre-run coffee.",
    replied: false,
  },
  {
    id: "rev-09",
    author: "Divya R",
    rating: 5,
    date: "2026-10-26",
    text: "The banoffee pie is unreal. Staff are warm and the playlist is great.",
    replied: true,
    replyText: "The banoffee has a fan club and you are in it, Divya!",
  },
  {
    id: "rev-10",
    author: "Karthik B",
    rating: 3,
    date: "2026-10-22",
    text: "Nice place but only 6-7 tables, so weekends mean waiting outside. More seating would help.",
    replied: false,
  },
  {
    id: "rev-11",
    author: "Shreya G",
    rating: 5,
    date: "2026-10-18",
    text: "Beautiful latte art and the barista explained the beans they use. A café that cares.",
    replied: true,
    replyText: "Thank you, Shreya! Our baristas will be thrilled.",
  },
  {
    id: "rev-12",
    author: "Nikhil D",
    rating: 2,
    date: "2026-10-15",
    text: "Ordered at the counter at 8 am, food came at 8:40. Slow service ruined a quick breakfast plan. Coffee itself was fine.",
    replied: false,
  },
];

export const UNANSWERED_REVIEWS = MOCK_REVIEWS.filter((r) => !r.replied);

// The Koramangala location has its own smaller, also flawed review set.
export const MOCK_REVIEWS_KORAMANGALA: Review[] = [
  {
    id: "rev-k01",
    author: "Ishita M",
    rating: 4,
    date: "2026-11-15",
    text: "Good cold brew and quieter than the Indiranagar outlet. Perfect for a laptop afternoon.",
    replied: true,
    replyText: "Glad it works for your work sessions, Ishita!",
  },
  {
    id: "rev-k02",
    author: "Varun S",
    rating: 2,
    date: "2026-11-11",
    text: "Walked 15 minutes here on a Tuesday afternoon and found the shutters down. Nothing online says the café is closed on Tuesdays. Waste of a trip.",
    replied: false,
  },
  {
    id: "rev-k03",
    author: "Priya L",
    rating: 4,
    date: "2026-11-07",
    text: "Cozy spot, friendly staff. The banoffee pie was great.",
    replied: false,
  },
  {
    id: "rev-k04",
    author: "Aditya R",
    rating: 3,
    date: "2026-11-02",
    text: "Coffee is fine but the Wi-Fi kept dropping during my calls. If this is a work-friendly café, the internet needs to hold up.",
    replied: false,
  },
  {
    id: "rev-k05",
    author: "Nandini K",
    rating: 5,
    date: "2026-10-28",
    text: "Best filter coffee in Koramangala, no contest.",
    replied: true,
    replyText: "High praise, Nandini. Thank you!",
  },
];

export const UNANSWERED_REVIEWS_KORAMANGALA = MOCK_REVIEWS_KORAMANGALA.filter((r) => !r.replied);
