"use client";

import { useEffect, useState } from "react";
import { scoreLabel } from "@/lib/scoreLabels";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function OptimizationScoreRing({ score }: { score: number }) {
  const [animate, setAnimate] = useState(false);
  const filled = CIRCUMFERENCE * (1 - score / 100);
  const label = scoreLabel(score);

  useEffect(() => {
    // Fill once on mount; reduced-motion users get the final state instantly
    // via the global media query that shortens animations.
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-36 w-36">
        <svg
          width="144"
          height="144"
          viewBox="0 0 144 144"
          role="img"
          aria-label={`Optimization score ${score} out of 100, ${label}`}
        >
          <circle
            cx="72"
            cy="72"
            r={RADIUS}
            fill="none"
            stroke="var(--mist)"
            strokeWidth="12"
          />
          <circle
            cx="72"
            cy="72"
            r={RADIUS}
            fill="none"
            stroke="var(--violet)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={filled}
            transform="rotate(-90 72 72)"
            className={animate ? "score-ring-animated" : undefined}
            style={
              {
                "--ring-empty": `${CIRCUMFERENCE}`,
                "--ring-filled": `${filled}`,
              } as React.CSSProperties
            }
          />
        </svg>
        <p className="tabular absolute inset-0 flex items-center justify-center font-heading text-2xl font-bold">
          {score}
        </p>
      </div>
      <p className="text-base font-semibold">{label}</p>
    </div>
  );
}
