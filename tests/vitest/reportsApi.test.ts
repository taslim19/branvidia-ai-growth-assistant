import { beforeEach, describe, expect, it } from "vitest";
import {
  MemoryReportStore,
  __resetReportStoreForTests,
} from "@/server/db/reportRepository";
import { __resetMongoClientForTests } from "@/server/db/mongoClient";
import { GET as listReports } from "@/app/api/reports/route";
import { GET as getReport } from "@/app/api/reports/[id]/route";
import { POST as runAnalysis } from "@/app/api/locations/[id]/analysis/route";
import { savedReportSummarySchema, reportSchema } from "@/server/apiSchemas";
import { __resetRateLimiterForTests } from "@/server/security/rateLimiter";
import { z } from "zod";

beforeEach(() => {
  delete process.env.MONGODB_URI;
  __resetMongoClientForTests();
  __resetReportStoreForTests();
  __resetRateLimiterForTests();
});

describe("report store (in-memory fallback)", () => {
  it("saves, lists newest-first and reads back", async () => {
    const store = new MemoryReportStore();
    const base = { businessName: "B", createdAt: "2026-11-22T08:00:00.000Z" };
    await store.save({ ...base, id: "r1", score: 51 } as never);
    await store.save({ ...base, id: "r2", score: 44, createdAt: "2026-11-22T09:00:00.000Z" } as never);
    const list = await store.list();
    expect(list.map((r) => r.id)).toEqual(["r2", "r1"]);
    expect((await store.get("r1"))?.score).toBe(51);
    expect(await store.get("missing")).toBeNull();
  });
});

describe("reports API routes", () => {
  it("GET /api/reports returns summaries after an analysis run", async () => {
    const req = new Request("http://localhost/api/locations/loc-indiranagar/analysis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intake: { name: "Brew & Bean Café" } }),
    });
    const res = await runAnalysis(req, { params: { id: "loc-indiranagar" } });
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(reportSchema.safeParse(report).success).toBe(true);

    const listRes = await listReports();
    expect(listRes.status).toBe(200);
    const list = z.array(savedReportSummarySchema).parse(await listRes.json());
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(report.id);
    expect(list[0].score).toBe(report.score);

    const getRes = await getReport(new Request(`http://localhost/api/reports/${report.id}`), {
      params: { id: report.id },
    });
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).id).toBe(report.id);

    const missing = await getReport(new Request("http://localhost/api/reports/nope"), {
      params: { id: "nope" },
    });
    expect(missing.status).toBe(404);
  });

  it("analysis rejects a bad body and an unknown location honestly", async () => {
    const badBody = await runAnalysis(
      new Request("http://localhost/api/locations/loc-indiranagar/analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
      { params: { id: "loc-indiranagar" } },
    );
    expect(badBody.status).toBe(400);

    const unknown = await runAnalysis(
      new Request("http://localhost/api/locations/loc-nowhere/analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      { params: { id: "loc-nowhere" } },
    );
    expect(unknown.status).toBe(404);
  });
});
