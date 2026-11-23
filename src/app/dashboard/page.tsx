"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSavedReports } from "@/hooks/useSavedReports";
import { reportsStoredOnDevice } from "@/lib/apiClient";
import { BusinessList } from "@/components/dashboard/BusinessList";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStoredConnection } from "@/hooks/useGoogleConnection";
import { FolderOpen } from "lucide-react";

export default function DashboardPage() {
  const { reports, loading, error, reload } = useSavedReports();
  const connection = useStoredConnection();
  // Where reports persist: this browser in pure mock mode, the backend's
  // durable store otherwise. Default matches the credential-free demo.
  const [onDevice, setOnDevice] = useState(true);
  useEffect(() => {
    setOnDevice(reportsStoredOnDevice());
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Your analyses</h1>
            <p className="mt-1 max-w-prose70 text-base text-slate">
              {onDevice
                ? "Reports you run are saved on this device so you can compare scores over time."
                : "Reports you run are saved securely in the cloud so you can compare scores over time."}
            </p>
          </div>
          <Link
            href="/assistant?new=1"
            className="inline-flex min-h-[44px] items-center rounded-full bg-violet px-5 py-2.5 text-base font-medium text-violet-on transition-colors duration-fast hover:bg-violet-strong"
          >
            Run a new analysis
          </Link>
        </div>

        {connection ? (
          <p className="mt-4 text-sm text-slate">
            Google connected as {connection.account.email}, {connection.location.name},{" "}
            {connection.location.area}
          </p>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3" role="status" aria-label="Loading saved analyses…">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => void reload()} />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="h-8 w-8" aria-hidden="true" />}
              title="No analyses yet"
              message="Chat with the assistant and connect a Google profile to get your first report."
              action={
                <Link
                  href="/assistant"
                  className="inline-flex min-h-[44px] items-center rounded-full bg-violet px-5 py-2.5 text-base font-medium text-violet-on transition-colors duration-fast hover:bg-violet-strong"
                >
                  Start an analysis
                </Link>
              }
            />
          ) : (
            <BusinessList reports={reports} />
          )}
        </div>

        {reports.length > 0 ? (
          <div className="mt-8">
            <Link
              href="/assistant?new=1"
              className="inline-flex min-h-[44px] items-center rounded-full border border-line px-5 py-2.5 text-base font-medium text-ink transition-colors duration-fast hover:bg-mist"
            >
              Run a new analysis
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
