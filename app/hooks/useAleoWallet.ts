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
  checking: boolean; // true while waiting for extension to load
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

  // Wait for Leo Wallet extension to inject window.leo
  useEffect(() => {
    waitForLeoWallet(2000).then((installed) => {
      setState((s) => ({ ...s, installed, checking: false }));

      if (installed) {
        getAleoWalletState().then((walletState) => {
          if (walletState.connected) {
            setState((s) => ({ ...s, ...walletState, installed: true, checking: false }));
          }
        });
      }
    });
  }, []);

  const connect = useCallback(async () => {
    // Wait up to 2s for extension in case user just installed it
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
    setState((s) => ({ ...s, connected: false, address: null, network: null, error: null }));
  }, []);

  return { ...state, connect, disconnect };
}
