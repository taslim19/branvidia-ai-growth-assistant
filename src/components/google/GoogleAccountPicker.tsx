"use client";

import type { GoogleAccount } from "@/types";
import { Card } from "@/components/ui/Card";
import { CircleUserRound } from "lucide-react";

export function GoogleAccountPicker({
  accounts,
  onPick,
  simulated = true,
}: {
  accounts: GoogleAccount[];
  onPick: (account: GoogleAccount) => void;
  /** False when the listed account is the real signed-in Google account. */
  simulated?: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Choose a Google account</h2>
      <p className="mt-1 text-base text-slate">Pick the account that manages your Business Profile.</p>
      <ul className="mt-4 space-y-2">
        {accounts.map((acc) => (
          <li key={acc.id}>
            <button
              type="button"
              onClick={() => onPick(acc)}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-input border border-line bg-surface px-4 py-3 text-left transition-colors duration-fast hover:bg-mist"
            >
              <CircleUserRound className="h-6 w-6 text-slate" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-base font-medium text-ink">{acc.name}</span>
                <span className="block truncate text-sm text-slate">{acc.email}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Card className="mt-4 p-3">
        <p className="text-sm text-slate">
          {simulated
            ? "This is a sample sign-in screen. No real Google account is used and no data leaves your browser."
            : "You signed in with your real Google account. Only the sign-in permissions you approved were used."}
        </p>
      </Card>
    </div>
  );
}
