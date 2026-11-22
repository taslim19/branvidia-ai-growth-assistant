"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatSession } from "@/hooks/useChatSession";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { AnalysisProgress } from "@/components/analysis/AnalysisProgress";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

function AssistantInner() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useChatSession(true);
  const analysis = useAnalysis();
  const { showToast } = useToast();
  const handledRef = useRef<string | null>(null);

  const connected = params.get("connected") === "1";
  const cancelled = params.get("cancelled") === "1";
  const fresh = params.get("new") === "1";
  const locId = params.get("locId") ?? "loc-indiranagar";
  const locLabel = params.get("loc") ?? "Brew & Bean Café";
  const reviewCount = Number(params.get("rc")) || 30;

  // "Run a new analysis" starts a clean intake instead of restoring the old
  // conversation.
  useEffect(() => {
    if (fresh && session.ready && handledRef.current !== "new") {
      handledRef.current = "new";
      session.restart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, session.ready]);

  useEffect(() => {
    const key = connected ? `connected:${locId}` : cancelled ? "cancelled" : null;
    if (!key || handledRef.current === key || !session.ready) return;
    handledRef.current = key;

    if (cancelled) {
      session.noteCancelled();
      return;
    }

    // Returned from the consent flow: confirm, then run the analysis inline.
    router.replace("/assistant");
    if (!session.noteConnected(locLabel)) return;
    showToast("Google connected");
    void analysis.run(locId, { intake: session.info, reviewCount }).then((report) => {
      if (report) {
        session.complete(report.id);
        router.push(`/report/${report.id}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, cancelled, locId, locLabel, reviewCount, session.ready]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="assistant-shell mx-auto flex w-full max-w-3xl min-h-0 flex-col px-4 py-4 sm:px-6">

        <Card lifted className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatHeader step={session.step} midConversation={session.midConversation} onRestart={() => { analysis.reset(); session.restart(); router.replace("/assistant"); }} lastReport={session.lastReport} />
          <ChatWindow
            messages={session.messages}
            typing={session.typing}
            error={session.error}
            onSend={(text) => void session.send(text)}
            onConnectGoogle={() => router.push("/connect/google?returnTo=/assistant")}
            onSkipOptIn={() => void session.skipOptIn()}
          />
        </Card>
        {analysis.running || analysis.doneSteps > 0 ? (
          <div className="mt-4">
            <AnalysisProgress
              steps={analysis.steps}
              stepIndex={analysis.stepIndex}
              doneSteps={analysis.doneSteps}
            />
          </div>
        ) : null}
        {analysis.error ? (
          <div className="mt-4">
            <ErrorState
              message={analysis.error}
              onRetry={() =>
                void analysis
                  .run(locId, { intake: session.info, reviewCount })
                  .then((r) => { if (r) {session.complete(r.id); router.push(`/report/${r.id}`);} })
              }
              retryLabel="Run analysis again"
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantInner />
    </Suspense>
  );
}
