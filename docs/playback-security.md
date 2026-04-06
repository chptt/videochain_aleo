
# Playback Security Model

## Protections in place

1. Video encrypted at rest (AES-256-GCM, per-content key)
2. Content key never exposed to frontend
3. Session key derived from content key + nonce (single-use)
4. Playback sessions expire in SESSION_EXPIRY_SECONDS (default 5 min)
5. Sessions are single-use (consumed on first stream request)
6. Stream endpoint requires valid session JWT
7. Aleo entitlement verified before session issuance
8. Rate limiting on session issuance (10/min per user)
9. IP hash logged for audit (raw IP never stored)
10. Cache-Control: no-store on stream responses

## Session lifecycle

```
ACTIVE → CONSUMED (after first stream)
ACTIVE → EXPIRED  (after TTL)
ACTIVE → REVOKED  (admin action)
```

## Anti-replay

- Each session has a unique nonce
- Nonce checked against revoked_nonces mapping on Aleo
- Session consumed immediately after first use

## Known limitations

- Video decrypted fully in memory before streaming (no chunked decrypt yet)
- No hardware DRM (Widevine/FairPlay) — future improvement
- Watermarking not yet implemented
- Screen recording cannot be prevented at the software level
