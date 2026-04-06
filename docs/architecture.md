
# Architecture Overview

## Layers

```
Browser (Next.js)
  │
  ├── Aleo Wallet (Leo/Puzzle)   ← private entitlement proofs
  │
  └── App API Routes (Next.js server)
        │
        ├── services/entitlement  ← Aleo tx verification + cache
        ├── services/playback     ← short-lived session issuance
        ├── services/encryption   ← AES-256-GCM key management
        ├── services/storage      ← pluggable encrypted blob storage
        └── services/db           ← Prisma / PostgreSQL
```

## Data flow — upload

1. Creator selects video in browser
2. Browser encrypts video with AES-256-GCM (per-content key)
3. Encrypted blob uploaded to storage (IPFS/Walrus/local)
4. Content key wrapped with master wrap secret, stored in DB
5. Video metadata stored in DB (no plaintext video, no raw key)

## Data flow — playback

1. Viewer opens video page
2. Frontend checks local entitlement cache via API
3. If entitled, frontend executes `validate_access` on Aleo wallet
4. Aleo wallet produces a transaction ID (proof of valid private record)
5. Frontend sends tx ID to `/api/playback/session`
6. Backend verifies tx on Aleo RPC, checks local cache
7. Backend issues short-lived session (JWT + wrapped session key)
8. Frontend presents session token to `/api/stream/[contentId]`
9. Backend decrypts video in memory, streams to client
10. Session is consumed (single-use)

## Key isolation

- Master encryption key: server-only env var
- Per-content keys: wrapped, stored in DB, never in frontend
- Session keys: derived from content key + nonce, short-lived
- Aleo private key: server-only env var (for custodial grant_access)
- User Aleo private key: never leaves the user's wallet
