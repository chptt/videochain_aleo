
# VideoChain — Aleo Edition

Privacy-preserving premium video platform. Evolved from [VideoChain Sepolia](https://github.com/chptt/VIdeochain_sepolia) with Aleo replacing the Ethereum-based entitlement model.

## What changed from the Sepolia version

| Old (Sepolia) | New (Aleo) |
|---|---|
| Public EVM state as access truth | Private Aleo records as access truth |
| Ethereum contract verifies payment | Pluggable payment layer, Aleo grants entitlement |
| Backend reads on-chain state | Backend verifies Aleo ZK proof |
| Sepolia-only | Chain-agnostic, Aleo-native |

## Why Aleo

Aleo's zero-knowledge proofs let users prove they hold a valid access record **without revealing who they are or what they own**. Entitlement is private by default — no public ledger shows who paid for what.

## Architecture

```
Browser ──► Aleo Wallet (validate_access proof)
   │
   ▼
Next.js API Routes
   ├── /api/upload          encrypt + store video
   ├── /api/purchase        grant Aleo entitlement after payment
   ├── /api/playback/session  verify Aleo proof, issue session
   └── /api/stream/[id]     decrypt + stream (session-gated)
   │
   ├── services/entitlement  Aleo tx verification
   ├── services/playback     short-lived JWT sessions
   ├── services/encryption   AES-256-GCM
   └── services/storage      IPFS / Walrus / local
```

See `docs/architecture.md` for full detail.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- [Leo CLI](https://developer.aleo.org/leo/installation) (for Aleo program deployment)
- Pinata account (or use `local` storage for dev)

### Install

```bash
git clone <this-repo>
cd videochain-aleo
npm install
```

### Configure

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, MASTER_ENCRYPTION_KEY, KEY_WRAP_SECRET
# For dev: set STORAGE_PROVIDER=local, skip Aleo/Pinata keys
```

### Database

```bash
npm run db:generate
npm run db:push
```

### Run locally

```bash
npm run dev
# → http://localhost:3000
```

## Aleo program

```bash
cd aleo-programs/video_entitlement
leo build
# Deploy to testnet3:
leo deploy --network testnet3 --private-key $ALEO_PRIVATE_KEY
```

Update `ALEO_PROGRAM_ID` in `.env` after deployment.

See `docs/aleo-integration.md` for full integration guide.

## Environment variables

See `.env.example` for all variables with descriptions.

Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 64-char hex, signs session JWTs |
| `MASTER_ENCRYPTION_KEY` | 64-char hex, AES master key |
| `KEY_WRAP_SECRET` | 64-char hex, wraps per-content keys |
| `STORAGE_PROVIDER` | `pinata` / `walrus` / `local` |
| `ALEO_PROGRAM_ID` | Deployed program ID |
| `ALEO_PRIVATE_KEY` | Backend service account key |

## Deployment

### Frontend (Vercel)

```bash
# Set all env vars in Vercel dashboard
vercel deploy
```

### Backend (Railway / Render)

The app is a single Next.js deployment. Set all env vars in the platform dashboard.

## Known limitations

- Aleo wallet adapter is stubbed — integrate Leo Wallet or Puzzle Wallet SDK
- Payment processing is stubbed — integrate Stripe or on-chain payment
- Video streamed fully in memory (no chunked decrypt yet)
- No watermarking in v1

## Next steps for production

1. Integrate real Aleo wallet SDK (`@provablehq/sdk` or Leo Wallet adapter)
2. Add payment provider (Stripe or on-chain)
3. Add chunked video streaming with range requests
4. Add watermarking layer
5. Add Redis-backed rate limiting
6. Add admin dashboard for content moderation
7. Add subscription management
