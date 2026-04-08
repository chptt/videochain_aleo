/**
 * Prisma client singleton.
 * Supports both local SQLite and Turso (libSQL).
 * Detects libsql:// URLs and wires the @prisma/adapter-libsql automatically.
 */

import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient; prismaInit?: Promise<PrismaClient> };

async function buildClient(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL ?? "file:./prisma/videochain.db";

  if (url.startsWith("libsql://") || url.startsWith("libsql+wss://")) {
    const { createClient } = await import("@libsql/client");
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");

    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  return new PrismaClient({ datasources: { db: { url } } });
}

/** Returns the shared PrismaClient, initialising it on first call. */
export async function getDb(): Promise<PrismaClient> {
  if (g.prisma) return g.prisma;
  if (!g.prismaInit) {
    g.prismaInit = buildClient().then((c) => {
      g.prisma = c;
      return c;
    });
  }
  return g.prismaInit;
}

/**
 * Convenience re-export for code that already awaits at the call site.
 * Usage: const db = await getDb();
 *
 * For backwards-compat, also export a lazy proxy as `db` so existing
 * `db.video.findMany(...)` calls work — each model accessor returns a
 * Promise that resolves after the client is ready.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_t, model: string) {
    return new Proxy({} as Record<string, unknown>, {
      get(_t2, method: string) {
        return (...args: unknown[]) =>
          getDb().then((client) => {
            const m = (client as unknown as Record<string, Record<string, Function>>)[model];
            return m[method](...args);
          });
      },
    });
  },
});
