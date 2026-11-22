"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedReportSummary } from "@/types";
import { listReports, removeSavedReport } from "@/lib/apiClient";

export interface UseSavedReports {
  reports: SavedReportSummary[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  remove: (id: string) => void;
}

export function useSavedReports(): UseSavedReports {
  const [reports, setReports] = useState<SavedReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await listReports());
    } catch {
      setError("Saved analyses didn’t load. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = useCallback((id: string) => {
    try {
      removeSavedReport(id);
    } catch {
      // best-effort
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reports, loading, error, reload, remove };
}
