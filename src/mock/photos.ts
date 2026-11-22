import type { PhotoItem } from "@/types";

// 6 photos, all food and drink — deliberately missing interior, exterior,
// team and menu shots, which the Photo Insights section calls out.
export const MOCK_PHOTOS: PhotoItem[] = [
  {
    id: "photo-1",
    src: "/mock-photos/latte.svg",
    alt: "Cappuccino with leaf latte art in a white cup",
    type: "drink",
  },
  {
    id: "photo-2",
    src: "/mock-photos/filter-coffee.svg",
    alt: "South Indian filter coffee in a steel tumbler and dabara",
    type: "drink",
  },
  {
    id: "photo-3",
    src: "/mock-photos/croissant.svg",
    alt: "Plain butter croissant on a small plate",
    type: "food",
  },
  {
    id: "photo-4",
    src: "/mock-photos/banoffee.svg",
    alt: "Slice of banoffee pie with cream and banana",
    type: "food",
  },
  {
    id: "photo-5",
    src: "/mock-photos/cold-brew.svg",
    alt: "Cold brew coffee in a tall glass with ice",
    type: "drink",
  },
  {
    id: "photo-6",
    src: "/mock-photos/sandwich.svg",
    alt: "Grilled vegetable sandwich cut into triangles",
    type: "food",
  },
];
