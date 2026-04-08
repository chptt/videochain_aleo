"use client";

// No package imports — avoids ChunkLoadError from Node.js-only code in adapter packages

export interface AleoWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLeoWallet(): any {
  if (typeof window === "undefined") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Patch undefined properties that cause toString crash
  try { if (!leo.appName) leo.appName = "VideoChain"; } catch { /* readonly */ }
  try { if (!leo.network) leo.network = "testnetbeta"; } catch { /* readonly */ }

  // Try all network names
  for (const net of ["testnetbeta", "testnet", "mainnetbeta"]) {
    try { await leo.connect(net); break; } catch { /* try next */ }
  }

  // Get address
  let address: string | null = null;
  try {
    if (typeof leo.getAccount === "function") {
      const acc = await leo.getAccount();
      address = acc?.address ?? (typeof acc === "string" ? acc : null);
    }
  } catch { /* ignore */ }

  if (!address && leo.publicKey && typeof leo.publicKey === "string") {
    address = leo.publicKey;
  }

  if (!address) throw new Error("Could not get address. Try refreshing the page.");

  return { connected: true, address, network: "testnetbeta" };
}

export async function getAleoWalletState(): Promise<AleoWalletState> {
  const leo = getLeoWallet();
  if (!leo) return { connected: false, address: null, network: null };
  try {
    let address: string | null = null;
    if (typeof leo.getAccount === "function") {
      const acc = await leo.getAccount();
      address = acc?.address ?? (typeof acc === "string" ? acc : null);
    }
    if (!address && leo.publicKey && typeof leo.publicKey === "string") address = leo.publicKey;
    if (address) return { connected: true, address, network: "testnetbeta" };
  } catch { /* not connected */ }
  return { connected: false, address: null, network: null };
}

export async function disconnectAleoWallet(): Promise<void> {
  const leo = getLeoWallet();
  if (leo && typeof leo.disconnect === "function") try { await leo.disconnect(); } catch { /* ignore */ }
}

export async function signMessage(message: string): Promise<string> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const encoded = new TextEncoder().encode(message);
  const result = await leo.signMessage(encoded);
  const sig = result?.signature ?? result;
  return Buffer.from(sig).toString("hex");
}

const PROGRAM_ID = process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID ?? "video_entitlement.aleo";

export async function executeGrantAccess(inputs: string[]): Promise<{ txId: string }> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const acc = await leo.getAccount?.();
  const txId = await leo.requestTransaction({
    address: acc?.address ?? "", chainId: "testnetbeta",
    transitions: [{ program: PROGRAM_ID, functionName: "grant_access", inputs }],
    fee: 1000, feePrivate: false,
  });
  return { txId };
}

export async function executeValidateAccess(params: {
  record: string; contentId: string; currentTs: number;
}): Promise<{ txId: string }> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const acc = await leo.getAccount?.();
  const txId = await leo.requestTransaction({
    address: acc?.address ?? "", chainId: "testnetbeta",
    transitions: [{ program: PROGRAM_ID, functionName: "validate_access",
      inputs: [params.record, params.contentId, `${params.currentTs}u64`] }],
    fee: 1000, feePrivate: false,
  });
  return { txId };
}

export async function executeConsumeView(params: {
  record: string; contentId: string; currentTs: number; newNonce: string;
}): Promise<{ txId: string }> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const acc = await leo.getAccount?.();
  const txId = await leo.requestTransaction({
    address: acc?.address ?? "", chainId: "testnetbeta",
    transitions: [{ program: PROGRAM_ID, functionName: "consume_view",
      inputs: [params.record, params.contentId, `${params.currentTs}u64`, params.newNonce] }],
    fee: 1000, feePrivate: false,
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
