"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleConnection } from "@/hooks/useGoogleConnection";
import { GoogleAccountPicker } from "@/components/google/GoogleAccountPicker";
import { GooglePermissionScreen } from "@/components/google/GooglePermissionScreen";
import { BusinessLocationPicker } from "@/components/google/BusinessLocationPicker";
import { BusinessProfileSummary } from "@/components/google/BusinessProfileSummary";
import { DisconnectButton } from "@/components/google/DisconnectButton";
import { useClientModes } from "@/hooks/useClientModes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { ShieldCheck, Loader2 } from "lucide-react";
import { FlowProgress } from "@/components/chat/FlowProgress";

function ConnectInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Cancelling returns to the screen that started the flow so the opt-in
  // card can reappear there. A completed connection always continues on the
  // assistant screen, which owns the chat session and the analysis runner.
  const cancelTarget = params.get("returnTo") ?? "/assistant";
  const conn = useGoogleConnection();
  const modes = useClientModes();

  useEffect(() => {
    if (conn.stage === "idle" && !conn.ended && !conn.cancelled && !conn.loading && !conn.error) {
      void conn.begin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.stage, conn.ended]);

  useEffect(() => {
    if (conn.cancelled) {
      router.push(`${cancelTarget}${cancelTarget.includes("?") ? "&" : "?"}cancelled=1`);
    }
  }, [conn.cancelled, router, cancelTarget]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-4">
          <FlowProgress
            step={
              conn.stage === "location-picker" || conn.stage === "summary" || conn.ended ? 5 : 4
            }
          />
        </div>
        <div className="mb-6 flex items-center gap-2 text-sm text-slate">
          <ShieldCheck className="h-4 w-4 text-violet-fg" aria-hidden="true" />
          <p>
            {modes.useMock
              ? "Simulated Google consent flow: sample data, nothing real is connected."
              : modes.profileData === "live"
                ? "Real Google sign-in and live Business Profile data."
                : "Real Google sign-in. Business profile, reviews and photos are sample data."}
          </p>
        </div>
        <Card lifted className="p-5 sm:p-6">
          {conn.error && conn.stage === "idle" && !conn.ended ? (
            <ErrorState message={conn.error} onRetry={conn.retry} />
          ) : null}

          {conn.ended && conn.stage === "idle" ? (
            <div>
              <h2 className="text-lg font-semibold">Disconnected</h2>
              <p className="mt-1 text-base text-slate">
                Branvidia can no longer read any Google profile. Your saved reports stay on this
                device.
              </p>
              <div className="mt-4">
                <Button onClick={() => void conn.begin()}>Connect Google</Button>
              </div>
            </div>
          ) : null}

          {conn.stage === "idle" && !conn.error && !conn.ended ? (
            <div role="status" aria-label="Loading accounts…" className="space-y-3">
              <SkeletonText lines={2} />
            </div>
          ) : null}

          {conn.stage === "account-picker" ? (
            <GoogleAccountPicker
              accounts={conn.accounts}
              onPick={conn.pickAccount}
              simulated={modes.useMock}
            />
          ) : null}

          {conn.stage === "permissions" && conn.account ? (
            <>
              {conn.error ? (
                <p role="alert" className="mb-3 text-sm text-danger">
                  {conn.error}
                </p>
              ) : null}
              <GooglePermissionScreen
                account={conn.account}
                onAllow={() => void conn.allow()}
                onCancel={conn.cancel}
                loading={conn.loading}
              />
            </>
          ) : null}

          {conn.stage === "connecting" ? (
            <div role="status" className="flex items-center gap-3 py-8">
              <Loader2 className="spinner h-5 w-5 text-violet-fg" aria-hidden="true" />
              <p className="text-base text-ink">Connecting securely…</p>
            </div>
          ) : null}

          {conn.stage === "location-picker" ? (
            <>
              {conn.error ? (
                <p role="alert" className="mb-3 text-sm text-danger">
                  {conn.error}
                </p>
              ) : null}
              <BusinessLocationPicker
                locations={conn.locations}
                onPick={(loc) => void conn.pickLocation(loc)}
                loading={conn.loading}
              />
            </>
          ) : null}

          {conn.stage === "summary" && conn.profile && conn.location ? (
            <div>
              <h2 className="text-lg font-semibold">Connected</h2>
              <p className="mt-1 text-base text-slate">
                {modes.profileData === "live"
                  ? "Branvidia can now read this profile. Here’s what it sees."
                  : "Your Google account is connected. While sample data is on, Branvidia reads this sample profile instead."}
              </p>
              <div className="mt-4">
                <BusinessProfileSummary
                  profile={conn.profile}
                  sampleData={modes.profileData !== "live"}
                />
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  onClick={() =>
                    router.push(
                      `/assistant?connected=1&locId=${conn.location!.id}&loc=${encodeURIComponent(
                        `${conn.location!.name}, ${conn.location!.area}`,
                      )}&rc=${conn.profile!.reviewCount}`,
                    )
                  }
                >
                  Analyse this business
                </Button>
                <DisconnectButton onDisconnect={conn.disconnect} loading={conn.loading} />
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

export default function ConnectGooglePage() {
  return (
    <Suspense>
      <ConnectInner />
    </Suspense>
  );
}
