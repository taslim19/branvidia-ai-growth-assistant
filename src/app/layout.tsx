import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ToastProvider } from "@/components/ui/Toast";
import { clientModeInitScript } from "@/server/clientMode";

// Rendered per request so the mock/real mode (USE_MOCK gate) is resolved
// from the live environment, not frozen into a static build.
export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Branvidia AI Growth Assistant",
    template: "%s | Branvidia",
  },
  description:
    "Chat with Branvidia’s AI assistant, connect your Google Business Profile, and get a clear optimization report for your local business.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#131118" },
  ],
};

// Apply the stored theme before first paint so there is no flash.
const themeInit = `(function(){try{var t=localStorage.getItem('branvidia:theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="flex min-h-screen flex-col">
        <script dangerouslySetInnerHTML={{ __html: clientModeInitScript() }} />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-violet focus:px-4 focus:py-2 focus:text-violet-on"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <SiteHeader />
          <div id="main-content" className="flex min-h-0 flex-1 flex-col">
            {children}
          </div>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
