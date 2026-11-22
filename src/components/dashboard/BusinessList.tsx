"use client";

import { useMemo } from "react";
import type { SavedReportSummary } from "@/types";
import { SavedReportCard } from "./SavedReportCard";

// Groups saved analyses by business name so an owner with multiple
// businesses sees each business and its report history.
export function BusinessList({ reports }: { reports: SavedReportSummary[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, SavedReportSummary[]>();
    for (const r of reports) {
      const list = map.get(r.businessName) ?? [];
      list.push(r);
      map.set(r.businessName, list);
    }
    return Array.from(map.entries());
  }, [reports]);

  return (
    <div className="space-y-8">
      {groups.map(([business, items], i) => {
        // A single-card group would show the business name twice (group
        // heading plus card title), so the heading only appears once a group
        // actually groups several reports.
        const single = items.length === 1;
        return (
          <section
            key={business}
            aria-label={single ? business : undefined}
            aria-labelledby={single ? undefined : `biz-${i}`}
          >
            {single ? null : (
              <h2 id={`biz-${i}`} className="text-lg font-semibold" translate="no">
                {business}
              </h2>
            )}
            <ul className={`space-y-3 ${single ? "" : "mt-3"}`}>
              {items.map((r) => (
                <li key={r.id}>
                  <SavedReportCard report={r} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
