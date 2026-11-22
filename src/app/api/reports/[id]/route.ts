import { json } from "@/server/apiUtils";
import { getReportStore } from "@/server/db/reportRepository";

export const dynamic = "force-dynamic";

/** One saved report in full. */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (!params.id || params.id.length > 200) {
    return json({ error: "invalid_id", message: "Invalid report id." }, 400);
  }
  const store = await getReportStore();
  const report = await store.get(params.id);
  if (!report) {
    return json({ error: "not_found", message: "No saved report with this id." }, 404);
  }
  return json(report);
}
