"use client";

import { ShieldCheck } from "lucide-react";
import { PermissionList } from "./PermissionList";
import { Button } from "@/components/ui/Button";

export interface GoogleOptInCardProps {
  onConnect: () => void;
  onSkip: () => void;
  connectLabel?: string;
  loading?: boolean;
}

export function GoogleOptInCard({
  onConnect,
  onSkip,
  connectLabel = "Connect Google",
  loading = false,
}: GoogleOptInCardProps) {
  return (
    <div className="max-w-prose70 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-violet-fg" aria-hidden="true" />
        <h3 className="text-base font-semibold">Your choice, your control</h3>
      </div>
      <div className="mt-3">
        <PermissionList />
      </div>
      <p className="mt-3 text-sm text-slate">
        You can disconnect any time from the profile card or the dashboard. Skipping changes
        nothing you’ve told the assistant so far.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onConnect} loading={loading}>
          {connectLabel}
        </Button>
        <Button variant="secondary" onClick={onSkip} disabled={loading}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
