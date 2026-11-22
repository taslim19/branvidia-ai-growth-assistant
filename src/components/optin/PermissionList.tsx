"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { profileDataModeClient } from "@/lib/clientConfig";

const WILL_NEVER_DO = [
  "Post, edit or reply to reviews for you",
  "Share your data with anyone",
];

export function PermissionList() {
  // Honest about the data source: only "live" mode reads a real profile.
  const [firstItem, setFirstItem] = useState(
    "Analyse sample profile info, reviews and photos",
  );
  useEffect(() => {
    if (profileDataModeClient() === "live") {
      setFirstItem("Read your profile info, reviews and photos");
    }
  }, []);
  const willDo = [
    firstItem,
    "Analyse them with AI and write your report",
    "Save your reports so you can compare over time",
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h4 className="text-sm font-semibold text-ink">What Branvidia will do</h4>
        <ul className="mt-2 space-y-1.5">
          {willDo.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-ink">What Branvidia will never do</h4>
        <ul className="mt-2 space-y-1.5">
          {WILL_NEVER_DO.map((item) => (

            <li key={item} className="flex items-start gap-2 text-sm text-slate">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
