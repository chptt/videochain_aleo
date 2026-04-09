"use client";

export interface AleoWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}

function getLeoWallet(): any {
  if (typeof window === "undefined") return undefined;
  const w = window as any;
  return w.leoWallet ?? w.leo ?? w.aleo ?? undefined;
}

export function isLeoWalletInstalled(): boolean {
  return !!getLeoWallet();
}

export async function waitForLeoWallet(timeoutMs = 3000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (getLeoWallet()) return true;
  return new Promise((resolve) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (getLeoWallet()) { clearInterval(id); resolve(true); }
      else if (Date.now() - start > timeoutMs) { clearInterval(id); resolve(false); }
    }, 100);
  });
}

export async function connectAleoWallet(): Promise<AleoWalletState> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not found. Install from https://leo.app");

  const networks = ["testnetbeta", "testnet3", "mainnetbeta"];
  let lastErr: unknown;

  for (const network of networks) {
    try {
      await leo.connect("NO_DECRYPT", network);
      const address: string | null =
        typeof leo.publicKey === "string" && leo.publicKey ? leo.publicKey : null;
      if (!address) throw new Error("No address after connect");
      return { connected: true, address, network: "testnet" };
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(lastErr instanceof Error ? lastErr.message : "Could not connect to Leo Wallet");
}

export async function getAleoWalletState(): Promise<AleoWalletState> {
  const leo = getLeoWallet();
  if (!leo) return { connected: false, address: null, network: null };
  try {
    const address: string | null =
      typeof leo.publicKey === "string" && leo.publicKey ? leo.publicKey : null;
    if (address) return { connected: true, address, network: "testnet" };
  } catch {}
  return { connected: false, address: null, network: null };
}

export async function disconnectAleoWallet(): Promise<void> {
  const leo = getLeoWallet();
  if (leo && typeof leo.disconnect === "function") {
    try { await leo.disconnect(); } catch {}
  }
}

export async function signMessage(message: string): Promise<string> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const encoded = new TextEncoder().encode(message);
  const result = await leo.signMessage(encoded);
  const sig: Uint8Array = result?.signature ?? result;
  return Array.from(sig).map((b) => (b as number).toString(16).padStart(2, "0")).join("");
}

const PROGRAM_ID = process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID ?? "video_entitlement.aleo";

export async function executeGrantAccess(inputs: string[]): Promise<{ txId: string }> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const result = await leo.requestTransaction({
    address: leo.publicKey ?? "",
    chainId: "testnet",
    transitions: [{ program: PROGRAM_ID, functionName: "grant_access", inputs }],
    fee: 1000,
    feePrivate: false,
  });
  return { txId: result?.transactionId ?? result };
}

export function contentIdToField(contentId: string): string {
  let hash = BigInt(0);
  for (let i = 0; i < contentId.length; i++) {
    hash = (hash * BigInt(31) + BigInt(contentId.charCodeAt(i))) % (BigInt(2) ** BigInt(128));
  }
  return `${hash}field`;
}
