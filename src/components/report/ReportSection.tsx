import type { ReactNode } from "react";

// Shared report section wrapper: one calm document, hairline-separated.
export function ReportSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
