/**
 * Prisma client singleton.
 * Supports both local SQLite and Turso (libSQL) for Vercel.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./prisma/videochain.db";

  // For Turso (libSQL), we use the standard PrismaClient with the URL
  // The @prisma/adapter-libsql handles the connection at runtime
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
    datasources: {
      db: { url },
    },
  });
}

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
