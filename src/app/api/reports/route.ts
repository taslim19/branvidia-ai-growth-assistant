import { json } from "@/server/apiUtils";
import { getReportStore } from "@/server/db/reportRepository";

export const dynamic = "force-dynamic";

/** Saved report summaries, newest first, for the dashboard. */
export async function GET(): Promise<Response> {
  const store = await getReportStore();
  return json(await store.list());
}
