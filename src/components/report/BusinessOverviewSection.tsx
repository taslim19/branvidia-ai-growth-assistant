import type { Report } from "@/types";
import { ReportSection } from "./ReportSection";
import { formatRating, formatNumber } from "@/lib/formatters";

export function BusinessOverviewSection({ report }: { report: Report }) {
  const { business, profile } = report.overview;
  return (
    <ReportSection id="overview" title="Business overview">
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <Row label="Business" value={business.name} />
        <Row label="Category" value={business.category} />
        <Row label="Offers" value={business.productsServices} />
        <Row label="Customers" value={business.targetCustomers} />
        <Row label="Goal" value={business.goals} />
        <Row
          label="Google rating"
          value={`${formatRating(profile.rating)} from ${formatNumber(profile.reviewCount)} reviews`}
        />
      </dl>
      <p className="mt-4 max-w-prose70 text-base text-slate">
        Profile description today: &lsquo;{profile.description}&rsquo;
      </p>
    </ReportSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-slate">{label}</dt>
      <dd className="mt-0.5 break-words text-base text-ink">{value}</dd>
    </div>
  );
}
