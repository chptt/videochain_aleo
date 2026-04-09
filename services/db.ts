/**
 * Prisma client singleton.
 * Supports both local SQLite and Turso (libSQL).
 */

import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaInit?: Promise<PrismaClient>;
};

async function buildClient(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL ?? "file:./prisma/videochain.db";

  if (url.startsWith("libsql://") || url.startsWith("libsql+wss://")) {
    const { createClient } = await import("@libsql/client");
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");

    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN ?? "",
    });

    const adapter = new PrismaLibSQL(libsql);
    const client = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
    // Verify connection works
    await client.$connect();
    return client;
  }

  const client = new PrismaClient({ datasources: { db: { url } } });
  await client.$connect();
  return client;
}

export async function getDb(): Promise<PrismaClient> {
  if (g.prisma) return g.prisma;
  if (!g.prismaInit) {
    g.prismaInit = buildClient()
      .then((c) => {
        g.prisma = c;
        return c;
      })
      .catch((err) => {
        // Reset so next call retries
        g.prismaInit = undefined;
        throw err;
      });
  }
  return g.prismaInit;
}

// Keep the proxy export for any remaining usages
export const db = new Proxy({} as PrismaClient, {
  get(_t, model: string) {
    return new Proxy({} as Record<string, unknown>, {
      get(_t2, method: string) {
        return (...args: unknown[]) =>
          getDb().then((client) => {
            const m = (client as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[model];
            return m[method](...args);
          });
      },
    });
  },
});
