"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { useToast } from "./Toast";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  const { clearToasts } = useToast();
  // A visible error state replaces any stale success toast, so the toast can
  // never cover this block's retry action.
  useEffect(() => {
    clearToasts();
  }, [clearToasts]);
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-6"
    >
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      <p className="max-w-prose70 text-base text-slate">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
