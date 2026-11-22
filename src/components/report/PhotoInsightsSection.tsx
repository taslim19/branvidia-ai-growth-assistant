import type { PhotoInsights, PhotoItem } from "@/types";
import { ReportSection } from "./ReportSection";
import { Badge } from "@/components/ui/Badge";
import Image from "next/image";

const PHOTO_TYPE_LABEL: Record<string, string> = {
  food: "Food",
  drink: "Drinks",
  interior: "Interior",
  exterior: "Exterior",
  team: "Team",
  menu: "Menu",
};

export function PhotoInsightsSection({
  insights,
  photos,
}: {
  insights: PhotoInsights;
  photos: PhotoItem[];
}) {
  return (
    <ReportSection id="photo-insights" title="Photo insights">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <Image
            key={photo.id}
            src={photo.src}
            alt={photo.alt}
            width={320}
            height={240}
            loading={i < 2 ? undefined : "lazy"}
            className="aspect-[4/3] w-full rounded-input border border-line object-cover"
          />
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold">What your photos cover</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {insights.present.map((t) => (
              <Badge key={t} tone="success">
                {PHOTO_TYPE_LABEL[t]}
              </Badge>
            ))}
          </div>
          <h3 className="mt-4 text-base font-semibold">What’s missing</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {insights.missing.map((t) => (
              <Badge key={t} tone="danger">
                {PHOTO_TYPE_LABEL[t]}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold">Photo ideas</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate">
            {insights.contentIdeas.map((idea, i) => (
              <li key={i}>{idea}</li>
            ))}
          </ul>
        </div>
      </div>
    </ReportSection>
  );
}
