
"use client";

import { useEntitlement } from "@/app/hooks/useEntitlement";
import { useAleoWallet } from "@/app/hooks/useAleoWallet";
import { VideoPlayer } from "./VideoPlayer";
import type { Video } from "@/types";

export function PlaybackGate({ video }: { video: Video }) {
  const { connected, address, connect } = useAleoWallet();
  const { state, session, reason, requestPlayback } = useEntitlement(video.contentId);

  if (!connected || !address) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <span className="text-4xl">🔒</span>
        <p className="text-gray-300">Connect your Aleo wallet to verify access</p>
        <button onClick={connect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  if (state === "idle") {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <span className="text-4xl">▶</span>
        <p className="text-gray-300">Ready to watch? Verify your entitlement via Aleo.</p>
        <button
          onClick={() => requestPlayback(address)}
          className="btn-primary"
        >
          Verify & Watch
        </button>
      </div>
    );
  }

  if (state === "checking") {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-gray-400">Verifying Aleo entitlement…</p>
      </div>
    );
  }

  if ((state === "invalid" || state === "error") && !session) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <span className="text-4xl">🚫</span>
        <p className="text-red-400 font-medium">Access denied</p>
        <p className="text-sm text-gray-500">{reason ?? "Your entitlement could not be verified."}</p>
      </div>
    );
  }

  if (state === "valid" && session) {
    return (
      <VideoPlayer
        contentId={video.contentId}
        sessionId={session.sessionId}
        wrappedKey={session.wrappedKey}
        expiresAt={session.expiresAt}
      />
    );
  }

  return null;
}
