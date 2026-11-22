import type { Report, SavedReportSummary } from "@/types";
import { getDb, mongoConfigured, warnMemoryFallback } from "./mongoClient";

/**
 * Report persistence. MongoDB when MONGODB_URI is set, in-memory otherwise
 * (with a startup warning). The analysis route is the only writer; the
 * dashboard reads through GET /api/reports.
 */

export interface ReportStore {
  readonly kind: "mongo" | "memory";
  save(report: Report): Promise<void>;
  list(): Promise<SavedReportSummary[]>;
  get(id: string): Promise<Report | null>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toSummary(report: Report): SavedReportSummary {
  return {
    id: report.id,
    businessName: report.businessName,
    score: report.score,
    createdAt: report.createdAt,
  };
}

export class MemoryReportStore implements ReportStore {
  readonly kind = "memory" as const;
  private readonly reports = new Map<string, Report>();

  async save(report: Report): Promise<void> {
    this.reports.set(report.id, clone(report));
  }

  async list(): Promise<SavedReportSummary[]> {
    return Array.from(this.reports.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSummary);
  }

  async get(id: string): Promise<Report | null> {
    const report = this.reports.get(id);
    return report ? clone(report) : null;
  }
}

export class MongoReportStore implements ReportStore {
  readonly kind = "mongo" as const;

  private async collection() {
    const db = await getDb();
    if (!db) throw new Error("MongoDB is not configured.");
    return db.collection<any>("reports");
  }

  async save(report: Report): Promise<void> {
    const col = await this.collection();
    await col.replaceOne({ _id: report.id }, { ...clone(report), _id: report.id }, { upsert: true });
  }

  async list(): Promise<SavedReportSummary[]> {
    const col = await this.collection();
    const rows = await col
      .find({}, { projection: { businessName: 1, score: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return rows.map((row) => ({
      id: String(row._id),
      businessName: String(row.businessName ?? ""),
      score: Number(row.score ?? 0),
      createdAt: String(row.createdAt ?? ""),
    }));
  }

  async get(id: string): Promise<Report | null> {
    const col = await this.collection();
    const row = await col.findOne({ _id: id });
    if (!row) return null;
    const { _id, ...report } = row;
    void _id;
    return report as unknown as Report;
  }
}

let cached: ReportStore | null = null;

export async function getReportStore(): Promise<ReportStore> {
  if (cached) return cached;
  if (mongoConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        cached = new MongoReportStore();
        return cached;
      }
    } catch (err) {
      console.warn(
        `[branvidia] MongoDB is configured but unreachable (${(err as Error).message}); ` +
          "reports fall back to the in-memory store for this process.",
      );
    }
  } else {
    warnMemoryFallback("reports");
  }
  cached = new MemoryReportStore();
  return cached;
}

/** Test hook: drop the cached store. */
export function __resetReportStoreForTests(): void {
  cached = null;
}
