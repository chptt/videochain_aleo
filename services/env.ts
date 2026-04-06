/**
 * Validated environment configuration.
 * Throws at startup if required variables are missing.
 */

function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV:               optional("NODE_ENV", "development"),
  APP_URL:                optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // SQLite — no setup needed, just a local file
  DATABASE_URL:           optional("DATABASE_URL", "file:./prisma/videochain.db"),

  JWT_SECRET:             optional("JWT_SECRET", "dev-secret-change-in-production-please"),
  SESSION_EXPIRY_SECONDS: parseInt(optional("SESSION_EXPIRY_SECONDS", "300")),

  MASTER_ENCRYPTION_KEY:  require("MASTER_ENCRYPTION_KEY"),
  KEY_WRAP_SECRET:        require("KEY_WRAP_SECRET"),

  STORAGE_PROVIDER:       optional("STORAGE_PROVIDER", "local") as "pinata" | "walrus" | "local",
  PINATA_API_KEY:         optional("PINATA_API_KEY", ""),
  PINATA_SECRET_API_KEY:  optional("PINATA_SECRET_API_KEY", ""),
  PINATA_GATEWAY:         optional("PINATA_GATEWAY", "https://gateway.pinata.cloud"),
  WALRUS_PUBLISHER_URL:   optional("WALRUS_PUBLISHER_URL", "https://publisher.walrus-testnet.walrus.space"),
  WALRUS_AGGREGATOR_URL:  optional("WALRUS_AGGREGATOR_URL", "https://aggregator.walrus-testnet.walrus.space"),
  LOCAL_STORAGE_PATH:     optional("LOCAL_STORAGE_PATH", "./storage/uploads"),

  ALEO_NETWORK:           optional("NEXT_PUBLIC_ALEO_NETWORK", "testnet3"),
  ALEO_PROGRAM_ID:        optional("ALEO_PROGRAM_ID", "video_entitlement.aleo"),
  ALEO_PRIVATE_KEY:       optional("ALEO_PRIVATE_KEY", ""),
  ALEO_VIEW_KEY:          optional("ALEO_VIEW_KEY", ""),
  ALEO_RPC_URL:           optional("ALEO_RPC_URL", "https://api.explorer.provable.com/v1"),

  RATE_LIMIT_PLAYBACK:    parseInt(optional("RATE_LIMIT_PLAYBACK_PER_MIN", "10")),
  LOG_LEVEL:              optional("LOG_LEVEL", "info"),
} as const;
