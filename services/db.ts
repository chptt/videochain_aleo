/**
 * Prisma client singleton with Turso/libSQL support.
 * - Local dev: uses SQLite file (DATABASE_URL=file:./prisma/videochain.db)
 * - Production (Vercel): uses Turso (DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN)
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

async function createPrismaClient(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL ?? "file:./prisma/videochain.db";

  // Use Turso adapter when connecting to a remote libSQL database
  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    const { createClient } = await import("@libsql/client");
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");

    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
    } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  // Local SQLite file
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    datasources: { db: { url } },
  });
}

// Singleton — reuse in dev hot-reload
export const db: PrismaClient = globalForPrisma.prisma ?? await createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
