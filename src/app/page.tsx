"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatSession } from "@/hooks/useChatSession";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Card } from "@/components/ui/Card";
import { PermissionList } from "@/components/optin/PermissionList";
import { MessageSquare, BarChart3, Camera } from "lucide-react";

function LandingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useChatSession(true);
  const handledCancel = useRef(false);

  useEffect(() => {
    if (params.get("cancelled") === "1" && !handledCancel.current && session.ready) {
      handledCancel.current = true;
      session.noteCancelled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, session.ready]);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero: the product is the pitch. */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-4 sm:px-6 lg:grid-cols-2 lg:gap-12">
        <div className="order-2 flex flex-col justify-center lg:order-1">
          <h1 className="font-heading text-xl font-bold sm:text-2xl">
            Your Google profile, turned into a to-do list that grows your business
          </h1>
          <p className="mt-4 max-w-prose70 text-base text-slate sm:text-lg">
            Chat with Branvi, Branvidia’s AI assistant, connect your Google Business Profile, and
            get a clear report on what to fix first.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/report/brew-and-bean-2026-11-21"
              className="inline-flex min-h-[44px] items-center rounded-full border border-line px-5 py-2.5 text-base font-medium text-ink transition-colors duration-fast hover:bg-mist"
            >
              See a sample report
            </Link>
            <p className="text-sm text-slate">Sample data, no sign-up needed.</p>
          </div>
          <p className="mt-4 max-w-prose70 text-sm text-slate">Google connection is optional. We never post, edit or share anything.</p>
        </div>
        <Card lifted className="landing-chat order-1 flex min-h-0 min-w-0 flex-col overflow-hidden lg:order-2">
          <ChatHeader step={session.step} midConversation={session.midConversation} onRestart={session.restart} lastReport={session.lastReport} />
          <ChatWindow
            messages={session.messages}
            typing={session.typing}
            error={session.error}
            onSend={(text) => void session.send(text)}
            onConnectGoogle={() => router.push("/connect/google?returnTo=/")}
            onSkipOptIn={() => void session.skipOptIn()}
            compact
          />
        </Card>
      </section>

      {/* What the assistant does. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-lg font-semibold">What the assistant does</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            <li className="flex gap-3">
              <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-violet-fg" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold">Understands your business</h3>
                <p className="mt-1 text-sm text-slate">
                  Five short questions about what you sell, who you serve and what you want more of.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Camera className="mt-1 h-5 w-5 shrink-0 text-violet-fg" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold">Reads your reviews and photos</h3>
                <p className="mt-1 text-sm text-slate">
                  With your permission, it reads your Google profile: reviews, photos and details.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <BarChart3 className="mt-1 h-5 w-5 shrink-0 text-violet-fg" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold">Writes a report you can act on</h3>
                <p className="mt-1 text-sm text-slate">
                  A score, the problems it found, and specific fixes ordered by impact and effort.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* What it will and will not access. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-lg font-semibold">What it will and will not access</h2>
          <div className="mt-6">
            <PermissionList />
          </div>
          <p className="mt-4 max-w-prose70 text-sm text-slate">
            Access is read-only and you can revoke it any time. This site currently runs on sample
            data while the live connection is being built.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense>
      <LandingInner />
    </Suspense>
  );
}
