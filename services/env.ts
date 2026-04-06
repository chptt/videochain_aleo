/**
 * Environment configuration with safe defaults.
 * All vars are optional at build time — missing secrets will cause
 * runtime errors only when the relevant feature is used.
 */

function get(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV:               get("NODE_ENV", "development"),
  APP_URL:                get("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  DATABASE_URL:           get("DATABASE_URL", "file:./prisma/videochain.db"),
  TURSO_AUTH_TOKEN:       get("TURSO_AUTH_TOKEN", ""),

  JWT_SECRET:             get("JWT_SECRET", "dev-secret-change-in-production"),
  SESSION_EXPIRY_SECONDS: parseInt(get("SESSION_EXPIRY_SECONDS", "300")),
  REFRESH_TOKEN_SECRET:   get("REFRESH_TOKEN_SECRET", "dev-refresh-secret"),

  MASTER_ENCRYPTION_KEY:  get("MASTER_ENCRYPTION_KEY", "0".repeat(64)),
  KEY_WRAP_SECRET:        get("KEY_WRAP_SECRET", "0".repeat(64)),

  STORAGE_PROVIDER:       get("STORAGE_PROVIDER", "local") as "pinata" | "walrus" | "local",
  PINATA_API_KEY:         get("PINATA_API_KEY", ""),
  PINATA_SECRET_API_KEY:  get("PINATA_SECRET_API_KEY", ""),
  PINATA_GATEWAY:         get("PINATA_GATEWAY", "https://gateway.pinata.cloud"),
  WALRUS_PUBLISHER_URL:   get("WALRUS_PUBLISHER_URL", "https://publisher.walrus-testnet.walrus.space"),
  WALRUS_AGGREGATOR_URL:  get("WALRUS_AGGREGATOR_URL", "https://aggregator.walrus-testnet.walrus.space"),
  LOCAL_STORAGE_PATH:     get("LOCAL_STORAGE_PATH", "./storage/uploads"),

  ALEO_NETWORK:           get("NEXT_PUBLIC_ALEO_NETWORK", "testnetbeta"),
  ALEO_PROGRAM_ID:        get("ALEO_PROGRAM_ID", "video_entitlement.aleo"),
  ALEO_PRIVATE_KEY:       get("ALEO_PRIVATE_KEY", ""),
  ALEO_VIEW_KEY:          get("ALEO_VIEW_KEY", ""),
  ALEO_RPC_URL:           get("ALEO_RPC_URL", "https://api.explorer.provable.com/v1"),

  RATE_LIMIT_PLAYBACK:    parseInt(get("RATE_LIMIT_PLAYBACK_PER_MIN", "10")),
  LOG_LEVEL:              get("LOG_LEVEL", "info"),
} as const;
