"use client";

import type { GoogleAccount } from "@/types";
import { Button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

const SCOPES = [
  { scope: "See your business name, category, hours and description", why: "to check what’s missing" },
  { scope: "Read your reviews and ratings", why: "to find patterns in what customers say" },
  { scope: "See your photos", why: "to check what kinds of photos you have" },
];

export function GooglePermissionScreen({
  account,
  onAllow,
  onCancel,
  loading,
}: {
  account: GoogleAccount;
  onAllow: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-violet-fg" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Branvidia wants read-only access</h2>
      </div>
      <p className="mt-1 text-base text-slate">
        Signed in as {account.name} ({account.email})
      </p>
      <ul className="mt-4 space-y-3">
        {SCOPES.map((s) => (
          <li key={s.scope} className="rounded-input border border-line bg-surface px-4 py-3">
            <p className="text-base text-ink">{s.scope}</p>
            <p className="mt-0.5 text-sm text-slate">Branvidia uses this {s.why}.</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate">
        Read-only means Branvidia can look, never change. You can disconnect any time.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onAllow} loading={loading}>
          Allow
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
