"use client";

import { useAleoWallet } from "@/app/hooks/useAleoWallet";

export function AleoConnect() {
  const { connected, address, connecting, error, installed, connect, disconnect } =
    useAleoWallet();

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="badge-green text-xs">
          {address.slice(0, 8)}…{address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="btn-secondary text-xs px-3 py-1"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={connecting}
        className="btn-primary text-sm"
      >
        {connecting
          ? "Connecting…"
          : !installed
          ? "Install Leo Wallet"
          : "Connect Aleo Wallet"}
      </button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
