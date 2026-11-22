export function SiteFooter() {
  return (
    <footer className="print-hidden border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="font-heading text-base font-semibold" translate="no">
            Branvidia
          </p>
          <p className="mt-1 max-w-prose70 text-sm text-slate">
            Digital growth for local businesses. Bengaluru, India.
          </p>
        </div>
        <div className="text-sm text-slate">
          <p>
            <a
              href="mailto:contact@branvidia.com"
              className="inline-flex min-h-[44px] items-center hover:text-ink hover:underline"
            >
              contact@branvidia.com
            </a>
          </p>
          <p>
            <a
              href="tel:+916361427326"
              className="inline-flex min-h-[44px] items-center hover:text-ink hover:underline"
            >
              +91 63614 27326
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
