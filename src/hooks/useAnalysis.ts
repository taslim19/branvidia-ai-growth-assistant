"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessInfo, Report } from "@/types";
import { runAnalysis, persistReport } from "@/lib/apiClient";

export const ANALYSIS_STEP_LABELS = [
  "Checking your profile",
  "Reading {n} reviews",
  "Reviewing {p} photos",
  "Writing your report",
] as const;

export function analysisSteps(reviewCount: number, photoCount: number): string[] {
  return ANALYSIS_STEP_LABELS.map((l) =>
    l.replace("{n}", String(reviewCount)).replace("{p}", String(photoCount)),
  );
}

export interface RunOptions {
  intake?: Partial<BusinessInfo>;
  reviewCount?: number;
  photoCount?: number;
}

export interface UseAnalysis {
  running: boolean;
  stepIndex: number; // which step is active
  doneSteps: number;
  steps: string[];
  error: string | null;
  report: Report | null;
  run: (locationId: string, opts?: RunOptions) => Promise<Report | null>;
  reset: () => void;
}

const STEP_MS = 1100;

export function useAnalysis(): UseAnalysis {
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [doneSteps, setDoneSteps] = useState(0);
  const [steps, setSteps] = useState<string[]>(() => analysisSteps(30, 6));
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // No leaked timers after unmount.
  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setRunning(false);
    setStepIndex(0);
    setDoneSteps(0);
    setError(null);
    setReport(null);
  }, [clearTimers]);

  const run = useCallback(
    async (locationId: string, opts: RunOptions = {}): Promise<Report | null> => {
      clearTimers();
      setRunning(true);
      setStepIndex(0);
      setDoneSteps(0);
      setError(null);
      setReport(null);
      const stepTexts = analysisSteps(opts.reviewCount ?? 30, opts.photoCount ?? 6);
      setSteps(stepTexts);

      // Every stage must actually display, in order, before the run completes.
      // The stage sequence is awaited together with the analysis itself.
      const stageSequence = new Promise<void>((resolve) => {
        for (let i = 1; i <= stepTexts.length; i += 1) {
          const t = setTimeout(() => {
            if (i < stepTexts.length) {
              setStepIndex(i);
            }
            setDoneSteps(i);
            if (i === stepTexts.length) resolve();
          }, STEP_MS * i);
          timersRef.current.push(t);
        }
      });

      try {
        const [result] = await Promise.all([
          runAnalysis(locationId, opts.intake),
          stageSequence,
        ]);
        clearTimers();
        setReport(result);
        persistReport(result);
        return result;
      } catch {
        clearTimers();
        setError("The analysis didn’t finish. Nothing was saved. Run it again.");
        return null;
      } finally {
        setRunning(false);
      }
    },
    [clearTimers],
  );

  return { running, stepIndex, doneSteps, steps, error, report, run, reset };
}
