"use client";

/**
 * Aleo adapter using @demox-labs/aleo-wallet-adapter-leo
 * This is the correct way to interact with Leo Wallet browser extension.
 */

import {
  LeoWalletAdapter,
} from "@demox-labs/aleo-wallet-adapter-leo";
import {
  WalletAdapterNetwork,
  WalletNotConnectedError,
  DecryptPermission,
} from "@demox-labs/aleo-wallet-adapter-base";

export interface AleoWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}

// Singleton adapter instance
let _adapter: LeoWalletAdapter | null = null;

function getAdapter(): LeoWalletAdapter {
  if (!_adapter) {
    _adapter = new LeoWalletAdapter({ appName: "VideoChain" });
  }
  return _adapter;
}

// ─── Install check ────────────────────────────────────────────────────────────

export function isLeoWalletInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // Leo Wallet injects window.leoWallet or window.leo
  return !!(window as unknown as Record<string, unknown>).leoWallet ||
         !!(window as unknown as Record<string, unknown>).leo;
}

export async function waitForLeoWallet(timeoutMs = 3000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isLeoWalletInstalled()) return true;

  return new Promise((resolve) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (isLeoWalletInstalled()) {
        clearInterval(id);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(id);
        resolve(false);
      }
    }, 100);
  });
}

// ─── Connect / disconnect ─────────────────────────────────────────────────────

export async function connectAleoWallet(): Promise<AleoWalletState> {
  const adapter = getAdapter();

  await adapter.connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet);

  const address = adapter.publicKey ?? null;

  return {
    connected: !!address,
    address,
    network: "testnet",
  };
}

export async function getAleoWalletState(): Promise<AleoWalletState> {
  const adapter = getAdapter();
  const address = adapter.publicKey ?? null;
  return {
    connected: adapter.connected,
    address,
    network: "testnet",
  };
}

export async function disconnectAleoWallet(): Promise<void> {
  const adapter = getAdapter();
  if (adapter.connected) {
    await adapter.disconnect();
  }
}

// ─── Sign message ─────────────────────────────────────────────────────────────

export async function signMessage(message: string): Promise<string> {
  const adapter = getAdapter();
  if (!adapter.connected) throw new WalletNotConnectedError();

  const encoded = new TextEncoder().encode(message);
  const signed = await adapter.signMessage(encoded);
  return Buffer.from(signed).toString("hex");
}

// ─── Execute transitions ──────────────────────────────────────────────────────

const PROGRAM_ID =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID) ||
  "video_entitlement.aleo";

export async function executeGrantAccess(inputs: string[]): Promise<{ txId: string }> {
  const adapter = getAdapter();
  if (!adapter.connected) throw new WalletNotConnectedError();

  const txId = await adapter.requestTransaction({
    address: adapter.publicKey!,
    chainId: "testnet",
    transitions: [{
      program: PROGRAM_ID,
      functionName: "grant_access",
      inputs,
    }],
    fee: 1000,
    feePrivate: false,
  });

  return { txId };
}

export async function executeValidateAccess(params: {
  record: string;
  contentId: string;
  currentTs: number;
}): Promise<{ txId: string }> {
  const adapter = getAdapter();
  if (!adapter.connected) throw new WalletNotConnectedError();

  const txId = await adapter.requestTransaction({
    address: adapter.publicKey!,
    chainId: "testnet",
    transitions: [{
      program: PROGRAM_ID,
      functionName: "validate_access",
      inputs: [params.record, params.contentId, `${params.currentTs}u64`],
    }],
    fee: 1000,
    feePrivate: false,
  });

  return { txId };
}

export async function executeConsumeView(params: {
  record: string;
  contentId: string;
  currentTs: number;
  newNonce: string;
}): Promise<{ txId: string }> {
  const adapter = getAdapter();
  if (!adapter.connected) throw new WalletNotConnectedError();

  const txId = await adapter.requestTransaction({
    address: adapter.publicKey!,
    chainId: "testnet",
    transitions: [{
      program: PROGRAM_ID,
      functionName: "consume_view",
      inputs: [params.record, params.contentId, `${params.currentTs}u64`, params.newNonce],
    }],
    fee: 1000,
    feePrivate: false,
  });

  return { txId };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function contentIdToField(contentId: string): string {
  let hash = BigInt(0);
  for (let i = 0; i < contentId.length; i++) {
    hash =
      (hash * BigInt(31) + BigInt(contentId.charCodeAt(i))) %
      (BigInt(2) ** BigInt(128));
  }
  return `${hash}field`;
}
