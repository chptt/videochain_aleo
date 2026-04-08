"use client";

import { useState, useCallback, useEffect } from "react";
import {
  connectAleoWallet,
  disconnectAleoWallet,
  getAleoWalletState,
  waitForLeoWallet,
} from "@/app/lib/aleo-adapter";

export interface AleoWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
  connecting: boolean;
  error: string | null;
  installed: boolean;
  checking: boolean;
}

/** Creates a server session for the given address. Silent — never throws. */
async function ensureSession(address: string, network: string): Promise<void> {
  try {
    const res = await fetch("/api/auth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ aleoAddress: address, network }),
    });
    if (!res.ok) console.warn("Session creation failed", res.status);
  } catch (err) {
    console.warn("Session creation error", err);
  }
}

export function useAleoWallet() {
  const [state, setState] = useState<AleoWalletState>({
    connected: false,
    address: null,
    network: null,
    connecting: false,
    error: null,
    installed: false,
    checking: true,
  });

  // On mount: check if wallet is already connected and ensure a session exists
  useEffect(() => {
    waitForLeoWallet(2000).then(async (installed) => {
      setState((s) => ({ ...s, installed, checking: false }));

      if (installed) {
        const walletState = await getAleoWalletState();
        if (walletState.connected && walletState.address) {
          setState((s) => ({ ...s, ...walletState, installed: true, checking: false }));
          // Ensure a valid server session exists for the restored wallet state
          await ensureSession(walletState.address, walletState.network ?? "testnet");
        }
      }
    });
  }, []);

  const connect = useCallback(async () => {
    const installed = await waitForLeoWallet(2000);

    if (!installed) {
      window.open("https://leo.app", "_blank");
      setState((s) => ({
        ...s,
        error: "Leo Wallet not found. Install it from leo.app then refresh.",
      }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const result = await connectAleoWallet();
      setState({ ...result, connecting: false, error: null, installed: true, checking: false });
      // Create server session immediately after connecting
      await ensureSession(result.address!, result.network ?? "testnet");
    } catch (err) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: err instanceof Error ? err.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectAleoWallet();
    // Clear server session
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    setState((s) => ({ ...s, connected: false, address: null, network: null, error: null }));
  }, []);

  return { ...state, connect, disconnect };
}
