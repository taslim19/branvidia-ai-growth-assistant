"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Report } from "@/types";
import { getReport, isReportPersisted } from "@/lib/apiClient";
import { OptimizationScoreRing } from "@/components/report/OptimizationScoreRing";
import { ScoreBreakdown } from "@/components/report/ScoreBreakdown";
import { BusinessOverviewSection } from "@/components/report/BusinessOverviewSection";
import { ProfileReviewSection } from "@/components/report/ProfileReviewSection";
import { ReviewInsightsSection } from "@/components/report/ReviewInsightsSection";
import { PhotoInsightsSection } from "@/components/report/PhotoInsightsSection";
import { ProblemsIdentifiedSection } from "@/components/report/ProblemsIdentifiedSection";
import { OptimizationSuggestionsSection } from "@/components/report/OptimizationSuggestionsSection";
import { SuggestedReviewRepliesSection } from "@/components/report/SuggestedReviewRepliesSection";
import { NextStepsSection } from "@/components/report/NextStepsSection";
import { ExportPdfButton } from "@/components/report/ExportPdfButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/formatters";
import { FlowProgress } from "@/components/chat/FlowProgress";

export default function ReportPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notSaved, setNotSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getReport(reportId);
      setReport(loaded);
      setNotSaved(!isReportPersisted(loaded.id));
    } catch (e) {
      setReport(null);
      setError(e instanceof Error && e.message === "Report not found" ? "not-found" : "load-error");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {loading ? (
          <div role="status" aria-label="Loading report…" className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <SkeletonText lines={4} />
          </div>
        ) : error === "not-found" ? (
          <EmptyState
            title="This report isn’t on this device"
            message="Reports are saved in this browser. Run a new analysis to get a fresh report."
            action={
              <Link
                href="/assistant?new=1"
                className="inline-flex min-h-[44px] items-center rounded-full bg-violet px-5 py-2.5 text-base font-medium text-violet-on transition-colors duration-fast hover:bg-violet-strong"
              >
                Run a new analysis
              </Link>
            }
          />
        ) : error ? (
          <ErrorState message="The report didn’t load. Check your connection and try again." onRetry={() => void load()} />
        ) : report ? (
          <>
            {/* Print-only letterhead: the screen header and footer are hidden in print. */}
            <div className="hidden print:mb-6 print:flex print:items-center print:justify-between print:border-b print:border-line print:pb-4">
              <div className="print:flex print:items-center print:gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- plain img prints reliably */}
                <img src="/branvidia-logo.svg" alt="" width={24} height={24} />
                <p className="font-heading text-base font-semibold" translate="no">
                  Branvidia
                </p>
              </div>
              <p className="text-sm text-slate">
                contact@branvidia.com, +91 63614 27326
              </p>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">Optimization report</h1>
                <p className="mt-1 text-sm text-slate">
                  <span translate="no">{report.businessName}</span>, generated {formatDateTime(report.createdAt)}, based on sample profile data
                </p>
              </div>
              <Badge tone="violet">Demo report</Badge>
            </div>
            {notSaved ? (
              <div
                role="status"
                className="print-hidden mt-6 rounded-card border border-warning bg-warning-tint px-4 py-3 text-sm text-warning-ink"
              >
                This report could not be saved because browser storage is unavailable. You can read it here, but it will not appear in your dashboard history.
              </div>
            ) : null}
            <div className="print-hidden mt-6">
              <FlowProgress step={9} />
            </div>
            <div className="mt-8 grid gap-10 lg:grid-cols-[320px_1fr]">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <Card className="p-6">
                  <OptimizationScoreRing score={report.score} />
                  <div className="mt-6">
                    <ScoreBreakdown breakdown={report.breakdown} />
                  </div>
                  <div className="mt-6 flex flex-col gap-2">
                    <ExportPdfButton />
                    <Link
                      href="/assistant?new=1"
                      className="print-hidden inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-base font-medium text-violet-fg transition-colors duration-fast hover:bg-mist"
                    >
                      Run a new analysis
                    </Link>
                  </div>
                </Card>
              </aside>
              <div className="min-w-0">
                <BusinessOverviewSection report={report} />
                <ProfileReviewSection checks={report.overview.profile.fieldChecks} />
                <ReviewInsightsSection insights={report.reviewInsights} />
                <PhotoInsightsSection insights={report.photoInsights} photos={report.photos} />
                <ProblemsIdentifiedSection problems={report.problems} />
                <OptimizationSuggestionsSection suggestions={report.suggestions} />
                <SuggestedReviewRepliesSection drafts={report.replyDrafts} />
                <NextStepsSection steps={report.nextSteps} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
