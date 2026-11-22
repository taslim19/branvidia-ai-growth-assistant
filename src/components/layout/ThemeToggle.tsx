"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "branvidia:theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#131118" : "#FAFAFC");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    function sync() {
      let stored: string | null = null;
      try { stored = window.localStorage.getItem(THEME_KEY); } catch { /* System fallback. */ }
      const next = stored === "dark" || stored === "light" ? stored : system.matches ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
    }
    sync();
    system.addEventListener("change", sync);
    return () => system.removeEventListener("change", sync);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // best-effort
    }
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate hover:bg-mist"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
