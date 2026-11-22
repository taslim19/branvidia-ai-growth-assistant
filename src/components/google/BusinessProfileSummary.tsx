import type { BusinessProfile } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRating, formatNumber } from "@/lib/formatters";
import { Star } from "lucide-react";

export function BusinessProfileSummary({
  profile,
  sampleData = false,
}: {
  profile: BusinessProfile;
  /** True while profile/reviews/photos come from the bundled sample data. */
  sampleData?: boolean;
}) {
  return (
    <Card className="p-5">
      {sampleData ? (
        <div className="mb-3">
          <Badge tone="neutral">Sample profile data</Badge>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{profile.name}</h3>
          <p className="mt-0.5 text-sm text-slate">
            {profile.category}, {profile.address}
          </p>
        </div>
        <Badge tone="violet">
          <Star className="h-3.5 w-3.5" aria-hidden="true" />
          {formatRating(profile.rating)}, {formatNumber(profile.reviewCount)} reviews
        </Badge>
      </div>
      <p className="mt-3 max-w-prose70 text-base text-ink">{profile.description}</p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="font-medium text-slate">Phone</dt>
          <dd className="text-ink">{profile.phone}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-slate">Website</dt>
          <dd className="text-ink">{profile.websiteUrl ?? "Not set"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-slate">Menu</dt>
          <dd className="text-ink">{profile.menuUrl ?? "Not set"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-slate">Weekend hours</dt>
          <dd className="text-ink">
            {profile.hours.find((h) => h.day === "Saturday")?.open ? "Set" : "Not set"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
