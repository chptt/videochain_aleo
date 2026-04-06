
"use client";

import { useState, useCallback } from "react";
import { api } from "@/app/lib/api";
import { executeValidateAccess, contentIdToField } from "@/app/lib/aleo-adapter";
import type { PlaybackSession } from "@/types";

type EntitlementState = "idle" | "checking" | "valid" | "invalid" | "error";

export function useEntitlement(contentId: string) {
  const [state, setState] = useState<EntitlementState>("idle");
  const [session, setSession] = useState<PlaybackSession | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const requestPlayback = useCallback(
    async (aleoAddress: string, aleoRecord?: string) => {
      setState("checking");
      setReason(null);
      try {
        let aleoTxId: string | undefined;

        // If user has an Aleo record, execute validate_access client-side
        if (aleoRecord && aleoAddress) {
          const { txId } = await executeValidateAccess({
            record: aleoRecord,
            contentId: contentIdToField(contentId),
            currentTs: Math.floor(Date.now() / 1000),
          });
          aleoTxId = txId;
        }

        const res = await api.playback.requestSession({
          contentId,
          aleoAddress,
          aleoTxId,
        });

        if (res.success && res.data) {
          setSession(res.data);
          setState("valid");
        } else {
          setReason(res.error ?? "Access denied");
          setState("invalid");
        }
      } catch (err) {
        setReason(String(err));
        setState("error");
      }
    },
    [contentId]
  );

  return { state, session, reason, requestPlayback };
}
