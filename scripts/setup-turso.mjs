import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://videochain-chptt.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU0NzQ1NjgsImlkIjoiMDE5ZDYyODctN2EwMS03YjZhLWE3NTItMTk3OWJiNDM5ZTYwIiwicmlkIjoiYzFiOTljYzEtZTZiMC00YzU0LTlmN2UtMDM0N2VjYmFmYWU0In0.9JwoJoiJptDg4QrzIzbh-fRirjcdCkna319_lgZIiBvE-5bkOnufbQ8X4vb77Kemv3Uz7TB1RWRrMA19zdECAQ",
});

const statements = [
  `CREATE TABLE IF NOT EXISTS Video (
    id TEXT PRIMARY KEY,
    contentId TEXT UNIQUE NOT NULL,
    creatorAddress TEXT NOT NULL,
    encryptedVideoUri TEXT NOT NULL,
    metadataUri TEXT NOT NULL,
    contentHash TEXT NOT NULL,
    encryptedKeyRef TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PUBLISHED',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS PlaybackSession (
    id TEXT PRIMARY KEY,
    sessionId TEXT UNIQUE NOT NULL,
    aleoAddress TEXT NOT NULL,
    videoId TEXT NOT NULL,
    nonce TEXT UNIQUE NOT NULL,
    wrappedKey TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    issuedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumedAt DATETIME,
    ipBinding TEXT,
    FOREIGN KEY (videoId) REFERENCES Video(id)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_video_contentId ON Video(contentId)",
  "CREATE INDEX IF NOT EXISTS idx_video_creator ON Video(creatorAddress)",
  "CREATE INDEX IF NOT EXISTS idx_session_aleoAddress ON PlaybackSession(aleoAddress)",
  "CREATE INDEX IF NOT EXISTS idx_session_videoId ON PlaybackSession(videoId)",
  "CREATE INDEX IF NOT EXISTS idx_session_sessionId ON PlaybackSession(sessionId)",
];

for (const sql of statements) {
  await client.execute(sql);
  console.log("OK:", sql.slice(0, 60).replace(/\n/g, " "));
}

console.log("\nAll tables created in Turso successfully!");
