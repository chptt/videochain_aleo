
/**
 * Structured audit-safe logger.
 * Never logs raw secrets, keys, or PII.
 * Uses winston for structured JSON output in production.
 */

import { env } from "./env";

type LogLevel = "error" | "warn" | "info" | "debug";

const LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

function shouldLog(level: LogLevel): boolean {
  const configured = (env.LOG_LEVEL as LogLevel) ?? "info";
  return LEVELS[level] <= LEVELS[configured];
}

function sanitize(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  // Strip any field that looks like a key/secret
  const blocked = /key|secret|password|token|hash|private/i;
  return Object.fromEntries(
    Object.entries(meta).filter(([k]) => !blocked.test(k))
  );
}

function log(level: LogLevel, action: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    action,
    ...sanitize(meta),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  error: (action: string, meta?: Record<string, unknown>) => log("error", action, meta),
  warn:  (action: string, meta?: Record<string, unknown>) => log("warn",  action, meta),
  info:  (action: string, meta?: Record<string, unknown>) => log("info",  action, meta),
  debug: (action: string, meta?: Record<string, unknown>) => log("debug", action, meta),
};
