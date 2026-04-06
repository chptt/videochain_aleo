/**
 * Playback session service.
 * Issues short-lived, nonce-bound playback sessions after Aleo entitlement is verified.
 * Identity = Aleo address (no user accounts).
 */

import { db } from "./db";
import { env } from "./env";
import { logger } from "./logger";
import { generateNonce, wrapSessionKey, unwrapKey } from "./encryption";
import { SignJWT, jwtVerify } from "jose";
import type { PlaybackSession } from "@/types";

const SESSION_TTL = env.SESSION_EXPIRY_SECONDS;
const JWT_SECRET  = new TextEncoder().encode(env.JWT_SECRET);

export async function issuePlaybackSession(params: {
  aleoAddress: string;
  contentId: string;
  ipHash?: string;
}): Promise<PlaybackSession> {
  const { aleoAddress, contentId, ipHash } = params;

  const video = await db.video.findUnique({ where: { contentId } });
  if (!video) throw new Error("Video not found");

  const contentKey = unwrapKey(video.encryptedKeyRef, env.KEY_WRAP_SECRET);
  const nonce      = generateNonce();
  const wrappedKey = wrapSessionKey(contentKey, nonce, env.KEY_WRAP_SECRET);
  const expiresAt  = new Date(Date.now() + SESSION_TTL * 1000);

  const session = await db.playbackSession.create({
    data: {
      aleoAddress,
      videoId:   video.id,
      nonce,
      wrappedKey,
      expiresAt,
      ipHash,
      status:    "ACTIVE",
    },
  });

  // Sign a JWT the frontend presents to the stream endpoint
  const jwt = await new SignJWT({
    sub:   aleoAddress,
    sid:   session.sessionId,
    cid:   contentId,
    nonce,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_TTL}s`)
    .setIssuedAt()
    .sign(JWT_SECRET);

  logger.info("PLAYBACK_SESSION_ISSUED", { aleoAddress, contentId, sessionId: session.sessionId });

  // Return the JWT as the sessionId — the stream endpoint verifies it
  return {
    sessionId: jwt,
    wrappedKey,
    expiresAt: expiresAt.toISOString(),
    nonce,
  };
}

export async function verifyPlaybackJwt(token: string): Promise<{
  aleoAddress: string;
  sessionId: string;
  contentId: string;
  nonce: string;
}> {
  const { payload } = await jwtVerify(token, JWT_SECRET);

  const sessionId = payload.sid as string;
  const session   = await db.playbackSession.findUnique({ where: { sessionId } });

  if (!session || session.status !== "ACTIVE") throw new Error("Session not active");
  if (session.expiresAt < new Date()) {
    await db.playbackSession.update({ where: { id: session.id }, data: { status: "EXPIRED" } });
    throw new Error("Session expired");
  }

  return {
    aleoAddress: payload.sub as string,
    sessionId,
    contentId: payload.cid as string,
    nonce: payload.nonce as string,
  };
}

export async function consumeSession(sessionId: string): Promise<void> {
  await db.playbackSession.update({
    where: { sessionId },
    data: { status: "CONSUMED", consumedAt: new Date() },
  });
  logger.info("PLAYBACK_SESSION_CONSUMED", { sessionId });
}
