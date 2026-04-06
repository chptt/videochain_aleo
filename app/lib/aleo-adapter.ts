"use client";

/**
 * Aleo adapter using LeoWalletAdapter properly initialized.
 */

import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export interface AleoWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}

// Create a properly initialized adapter instance
let _adapter: LeoWalletAdapter | null = null;

function getAdapter(): LeoWalletAdapter {
  if (!_adapter) {
    _adapter = new LeoWalletAdapter({ appName: "VideoChain" });
  }
  return _adapter;
}

export function isLeoWalletInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const adapter = getAdapter();
    return adapter.readyState === "Installed" || adapter.readyState === "Loadable";
  } catch {
    return false;
  }
}

export async function waitForLeoWallet(timeoutMs = 3000): Promise<boolean> {
  if (typeof window === "undefined") return false;

  return new Promise((resolve) => {
    const start = Date.now();
    const id = setInterval(() => {
      try {
        const adapter = getAdapter();
        const ready = adapter.readyState === "Installed" || adapter.readyState === "Loadable";
        if (ready) { clearInterval(id); resolve(true); return; }
      } catch { /* not ready */ }
      if (Date.now() - start > timeoutMs) { clearInterval(id); resolve(false); }
    }, 100);
  });
}

export async function connectAleoWallet(): Promise<AleoWalletState> {
  const adapter = getAdapter();

  console.log("[Aleo] Adapter readyState:", adapter.readyState);

  await adapter.connect(
    DecryptPermission.UponRequest,
    WalletAdapterNetwork.TestnetBeta
  );

  const address = adapter.publicKey ?? null;
  console.log("[Aleo] Connected address:", address);

  return { connected: !!address, address, network: "testnetbeta" };
}

export async function getAleoWalletState(): Promise<AleoWalletState> {
  try {
    const adapter = getAdapter();
    const address = adapter.publicKey ?? null;
    return { connected: adapter.connected, address, network: "testnetbeta" };
  } catch {
    return { connected: false, address: null, network: null };
  }
}

export async function disconnectAleoWallet(): Promise<void> {
  try {
    const adapter = getAdapter();
    if (adapter.connected) await adapter.disconnect();
  } catch { /* ignore */ }
}

export async function signMessage(message: string): Promise<string> {
  const adapter = getAdapter();
  const encoded = new TextEncoder().encode(message);
  const signed = await adapter.signMessage(encoded);
  return Buffer.from(signed).toString("hex");
}

const PROGRAM_ID = process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID ?? "video_entitlement.aleo";

export async function executeGrantAccess(inputs: string[]): Promise<{ txId: string }> {
  const adapter = getAdapter();
  const txId = await adapter.requestTransaction({
    address: adapter.publicKey!,
    chainId: "testnetbeta",
    transitions: [{ program: PROGRAM_ID, functionName: "grant_access", inputs }],
    fee: 1000,
    feePrivate: false,
  });
  return { txId };
}

export async function executeValidateAccess(params: {
  record: string; contentId: string; currentTs: number;
}): Promise<{ txId: string }> {
  const adapter = getAdapter();
  const txId = await adapter.requestTransaction({
    address: adapter.publicKey!,
    chainId: "testnetbeta",
    transitions: [{ program: PROGRAM_ID, functionName: "validate_access",
      inputs: [params.record, params.contentId, `${params.currentTs}u64`] }],
    fee: 1000,
    feePrivate: false,
  });
  return { txId };
}

export async function executeConsumeView(params: {
  record: string; contentId: string; currentTs: number; newNonce: string;
}): Promise<{ txId: string }> {
  const adapter = getAdapter();
  const txId = await adapter.requestTransaction({
    address: adapter.publicKey!,
    chainId: "testnetbeta",
    transitions: [{ program: PROGRAM_ID, functionName: "consume_view",
      inputs: [params.record, params.contentId, `${params.currentTs}u64`, params.newNonce] }],
    fee: 1000,
    feePrivate: false,
  });
  return { txId };
}

export function contentIdToField(contentId: string): string {
  let hash = BigInt(0);
  for (let i = 0; i < contentId.length; i++) {
    hash = (hash * BigInt(31) + BigInt(contentId.charCodeAt(i))) % (BigInt(2) ** BigInt(128));
  }
  return `${hash}field`;
}
