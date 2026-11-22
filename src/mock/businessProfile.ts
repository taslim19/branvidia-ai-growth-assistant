import type { BusinessProfile, GoogleAccount, BusinessLocation } from "@/types";

export const MOCK_GOOGLE_ACCOUNT: GoogleAccount = {
  id: "ga-1",
  name: "Priya Ramesh",
  email: "priya.brewandbean@example.com",
};

export const MOCK_LOCATIONS: BusinessLocation[] = [
  {
    id: "loc-indiranagar",
    name: "Brew & Bean Café",
    area: "Indiranagar",
    city: "Bengaluru",
  },
  {
    id: "loc-koramangala",
    name: "Brew & Bean Café",
    area: "Koramangala",
    city: "Bengaluru",
  },
];

export const MOCK_BUSINESS_PROFILE: BusinessProfile = {
  locationId: "loc-indiranagar",
  name: "Brew & Bean Café",
  category: "Café",
  rating: 4.2,
  reviewCount: 30,
  // Deliberately thin: exactly 12 words.
  description: "Brew and Bean Café serves coffee, snacks and desserts in Indiranagar, Bengaluru.",
  phone: "+91 63614 27326",
  address: "100 Feet Road, Indiranagar, Bengaluru 560038",
  hours: [
    { day: "Monday", open: "9:00", close: "21:00" },
    { day: "Tuesday", open: "9:00", close: "21:00" },
    { day: "Wednesday", open: "9:00", close: "21:00" },
    { day: "Thursday", open: "9:00", close: "21:00" },
    { day: "Friday", open: "9:00", close: "21:00" },
    { day: "Saturday", open: null, close: null },
    { day: "Sunday", open: null, close: null },
  ],
  websiteUrl: null,
  menuUrl: null,
  attributes: [
    { label: "Outdoor seating", set: false },
    { label: "Wi-Fi", set: false },
    { label: "Vegetarian options", set: false },
    { label: "Parking", set: false },
  ],
  fieldChecks: [
    { field: "Business name", status: "ok", note: "Brew & Bean Café" },
    { field: "Category", status: "ok", note: "Café" },
    {
      field: "Description",
      status: "warning",
      note: "Only 12 words. It says almost nothing about what makes the café worth a visit.",
    },
    {
      field: "Weekend hours",
      status: "missing",
      note: "Saturday and Sunday hours are not set. Weekend searchers see “Hours might differ”.",
    },
    {
      field: "Website",
      status: "missing",
      note: "No website link. Google shows a “Website” button when one is set.",
    },
    {
      field: "Menu link",
      status: "missing",
      note: "No menu URL. Café searches often filter on menu availability.",
    },
    { field: "Phone", status: "ok", note: "+91 63614 27326" },
    {
      field: "Photos",
      status: "warning",
      note: "6 photos, all food and drinks. No interior, exterior, team or menu shots.",
    },
    {
      field: "Attributes",
      status: "missing",
      note: "Outdoor seating, Wi-Fi, vegetarian options and parking are not set.",
    },
  ],
};

// The second location has a different, also deliberately flawed profile so
// picking it produces a genuinely different report.
export const MOCK_BUSINESS_PROFILE_KORAMANGALA: BusinessProfile = {
  locationId: "loc-koramangala",
  name: "Brew & Bean Café",
  category: "Café",
  rating: 3.9,
  reviewCount: 14,
  description: "Coffee and more.",
  phone: "+91 63614 27326",
  address: "5th Block, Koramangala, Bengaluru 560095",
  hours: [
    { day: "Monday", open: "10:00", close: "20:00" },
    { day: "Tuesday", open: null, close: null },
    { day: "Wednesday", open: "10:00", close: "20:00" },
    { day: "Thursday", open: "10:00", close: "20:00" },
    { day: "Friday", open: "10:00", close: "20:00" },
    { day: "Saturday", open: null, close: null },
    { day: "Sunday", open: null, close: null },
  ],
  websiteUrl: null,
  menuUrl: null,
  attributes: [
    { label: "Outdoor seating", set: false },
    { label: "Wi-Fi", set: false },
    { label: "Vegetarian options", set: false },
    { label: "Parking", set: false },
  ],
  fieldChecks: [
    { field: "Business name", status: "ok", note: "Brew & Bean Café" },
    { field: "Category", status: "ok", note: "Café" },
    {
      field: "Description",
      status: "missing",
      note: "Three words. Customers and search both learn nothing from this.",
    },
    {
      field: "Opening hours",
      status: "missing",
      note: "Tuesday, Saturday and Sunday hours are not set.",
    },
    {
      field: "Website",
      status: "missing",
      note: "No website link. Google shows a “Website” button when one is set.",
    },
    {
      field: "Menu link",
      status: "missing",
      note: "No menu URL. Café searches often filter on menu availability.",
    },
    { field: "Phone", status: "ok", note: "+91 63614 27326" },
    {
      field: "Photos",
      status: "warning",
      note: "6 photos, all food and drinks. No interior, exterior, team or menu shots.",
    },
    {
      field: "Attributes",
      status: "missing",
      note: "Outdoor seating, Wi-Fi, vegetarian options and parking are not set.",
    },
  ],
};

export const MOCK_PROFILES: Record<string, BusinessProfile> = {
  "loc-indiranagar": MOCK_BUSINESS_PROFILE,
  "loc-koramangala": MOCK_BUSINESS_PROFILE_KORAMANGALA,
};
