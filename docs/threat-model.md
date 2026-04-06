
# Threat Model

## Assets

- Plaintext video content
- Content encryption keys
- User entitlement records
- Playback session tokens

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| Direct URL sharing | Sessions are single-use and short-lived |
| Key extraction from frontend | Keys never sent to frontend |
| Replay attack | Nonce-bound sessions, Aleo revocation |
| Entitlement forgery | Aleo ZK proof required, backend verifies on-chain |
| Storage breach | Only encrypted blobs stored off-chain |
| DB breach | Content keys are wrapped (not plaintext) |
| Session hijacking | IP hash binding (optional), short TTL |
| Brute force login | bcrypt password hashing, rate limiting (TODO) |
| Excessive session requests | Rate limiter on /api/playback/session |

## Trust boundaries

- Frontend: untrusted (user-controlled)
- Aleo wallet: trusted for proof generation (user-controlled)
- Backend: trusted (server-controlled)
- Aleo network: trusted for tx verification
- Storage: semi-trusted (only encrypted data stored)

## Out of scope (v1)

- Screen recording prevention
- Hardware DRM
- Watermarking
- Multi-region key management
