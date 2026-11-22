"use client";

import type { BusinessLocation } from "@/types";
import { MapPin } from "lucide-react";

export function BusinessLocationPicker({
  locations,
  onPick,
  loading,
}: {
  locations: BusinessLocation[];
  onPick: (location: BusinessLocation) => void;
  loading?: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Which business should Branvidia analyse?</h2>
      <p className="mt-1 text-base text-slate">
        This account manages {locations.length} locations.
      </p>
      <ul className="mt-4 space-y-2">
        {locations.map((loc) => (
          <li key={loc.id}>
            <button
              type="button"
              onClick={() => onPick(loc)}
              disabled={loading}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-input border border-line bg-surface px-4 py-3 text-left transition-colors duration-fast hover:bg-mist disabled:opacity-50"
            >
              <MapPin className="h-5 w-5 shrink-0 text-violet-fg" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-base font-medium text-ink">{loc.name}</span>
                <span className="block truncate text-sm text-slate">
                  {loc.area}, {loc.city}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
