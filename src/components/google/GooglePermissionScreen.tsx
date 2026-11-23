"use client";

import { useEffect, useState } from "react";
import type { GoogleAccount } from "@/types";
import { Button } from "@/components/ui/Button";
import { googleScopesClient } from "@/lib/clientConfig";
import { isMockModeClient } from "@/lib/apiClient";
import {
  requestsBusinessData,
  scopeDisplayList,
  type ScopeDisplay,
} from "@/lib/googleScopes";
import { Lock } from "lucide-react";

// Matches the hybrid default so the server render and first client render
// agree; the effect below swaps in this deployment's real list.
const DEFAULT_ITEMS = scopeDisplayList(["openid", "email", "profile"]);

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
  const [items, setItems] = useState<ScopeDisplay[]>(DEFAULT_ITEMS);
  const [businessData, setBusinessData] = useState(false);
  // In a real sign-in the Google consent already happened on
  // accounts.google.com; say so plainly so this app-served screen is not
  // mistaken for Google's. Default matches the simulated demo.
  const [simulated, setSimulated] = useState(true);
  useEffect(() => {
    const scopes = googleScopesClient();
    setItems(scopeDisplayList(scopes));
    setBusinessData(requestsBusinessData(scopes));
    setSimulated(isMockModeClient());
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-violet-fg" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Branvidia wants read-only access</h2>
      </div>
      <p className="mt-1 text-base text-slate">
        Signed in as {account.name} ({account.email})
      </p>
      {!simulated ? (
        <p className="mt-1 text-sm text-slate">
          You signed in on Google’s own consent screen (accounts.google.com). This page is shown by
          Branvidia, not Google, and confirms what that access covers.
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {items.map((s) => (
          <li key={s.scope} className="rounded-input border border-line bg-surface px-4 py-3">
            <p className="text-base text-ink">{s.scope}</p>
            <p className="mt-0.5 text-sm text-slate">Branvidia uses this {s.why}.</p>
          </li>
        ))}
      </ul>
      {!businessData ? (
        <p className="mt-3 text-sm text-slate">
          No access to your Business Profile, reviews or photos is requested. While sample data
          is on, the report is built from the bundled sample business instead.
        </p>
      ) : null}
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
