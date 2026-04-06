
# Aleo Integration

## What Aleo handles

- Private access records (who owns what, for how long)
- Zero-knowledge proof of entitlement (validate_access transition)
- View consumption (consume_view transition)
- Subscription renewal (renew_access transition)
- Nonce-based revocation (revoke_access transition)

## What Aleo does NOT handle

- Video storage (off-chain, encrypted)
- Video metadata (PostgreSQL)
- Payment processing (abstracted payment layer)
- Session management (backend JWT)

## Program: video_entitlement.aleo

Located in `aleo-programs/video_entitlement/src/main.leo`

### AccessRecord (private)

```leo
record AccessRecord {
    owner:       address,  // Aleo address of entitlement holder
    content_id:  field,    // video content ID
    access_type: u8,       // 1-5 (see types/index.ts)
    expires_at:  u64,      // unix timestamp; 0 = no expiry
    views_left:  u32,      // 0 = unlimited
    nonce:       field,    // unique serial
}
```

### Entitlement flow

```
Purchase confirmed
      │
      ▼
Backend calls buildGrantAccessInputs()
      │
      ▼
Client executes grant_access on Aleo wallet
      │
      ▼
AccessRecord created (private, only owner can read)
      │
      ▼
Viewer requests playback
      │
      ▼
Client executes validate_access on Aleo wallet
      │
      ▼
Backend verifies tx ID on Aleo RPC
      │
      ▼
Playback session issued
```

## Wallet integration

The frontend adapter is in `app/lib/aleo-adapter.ts`.

Currently stubbed — integrate with:
- [Leo Wallet](https://leo.app) browser extension
- [Puzzle Wallet](https://puzzle.online)
- [@provablehq/sdk](https://github.com/ProvableHQ/sdk)

## Deploy the program

```bash
cd aleo-programs/video_entitlement
leo build
leo deploy --network testnet3 --private-key $ALEO_PRIVATE_KEY
```

Update `ALEO_PROGRAM_ID` in `.env` with the deployed program ID.
