"use client";

/**
 * Aleo adapter — direct window.leoWallet API calls.
 * Leo Wallet extension injects window.leoWallet into the browser.
 */

export interface AleoWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}

// ─── Leo Wallet window API ────────────────────────────────────────────────────

interface LeoWalletAPI {
  connect: (network: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getAccount: () => Promise<{ address: string } | null>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  requestTransaction: (tx: {
    address: string;
    chainId: string;
    transitions: Array<{ program: string; functionName: string; inputs: string[] }>;
    fee: number;
    feePrivate: boolean;
  }) => Promise<string>;
}

function getLeoWallet(): LeoWalletAPI | undefined {
  if (typeof window === "undefined") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).leoWallet ?? (window as any).leo;
}

// ─── Install check ────────────────────────────────────────────────────────────

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

// ─── Connect / disconnect ─────────────────────────────────────────────────────

export async function connectAleoWallet(): Promise<AleoWalletState> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not found. Install it from https://leo.app");

  await leo.connect("testnet");

  const account = await leo.getAccount();
  if (!account?.address) throw new Error("No account returned from Leo Wallet");

  return { connected: true, address: account.address, network: "testnet" };
}

export async function getAleoWalletState(): Promise<AleoWalletState> {
  const leo = getLeoWallet();
  if (!leo) return { connected: false, address: null, network: null };
  try {
    const account = await leo.getAccount();
    if (account?.address) return { connected: true, address: account.address, network: "testnet" };
  } catch { /* not connected */ }
  return { connected: false, address: null, network: null };
}

export async function disconnectAleoWallet(): Promise<void> {
  const leo = getLeoWallet();
  if (leo) await leo.disconnect();
}

// ─── Sign message ─────────────────────────────────────────────────────────────

export async function signMessage(message: string): Promise<string> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const encoded = new TextEncoder().encode(message);
  const { signature } = await leo.signMessage(encoded);
  return Buffer.from(signature).toString("hex");
}

// ─── Execute transitions ──────────────────────────────────────────────────────

const PROGRAM_ID = process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID ?? "video_entitlement.aleo";

export async function executeGrantAccess(inputs: string[]): Promise<{ txId: string }> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const account = await leo.getAccount();
  const txId = await leo.requestTransaction({
    address: account?.address ?? "",
    chainId: "testnet",
    transitions: [{ program: PROGRAM_ID, functionName: "grant_access", inputs }],
    fee: 1000,
    feePrivate: false,
  });
  return { txId };
}

export async function executeValidateAccess(params: {
  record: string; contentId: string; currentTs: number;
}): Promise<{ txId: string }> {
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const account = await leo.getAccount();
  const txId = await leo.requestTransaction({
    address: account?.address ?? "",
    chainId: "testnet",
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
  const leo = getLeoWallet();
  if (!leo) throw new Error("Leo Wallet not connected");
  const account = await leo.getAccount();
  const txId = await leo.requestTransaction({
    address: account?.address ?? "",
    chainId: "testnet",
    transitions: [{ program: PROGRAM_ID, functionName: "consume_view",
      inputs: [params.record, params.contentId, `${params.currentTs}u64`, params.newNonce] }],
    fee: 1000,
    feePrivate: false,
  });
  return { txId };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function contentIdToField(contentId: string): string {
  let hash = BigInt(0);
  for (let i = 0; i < contentId.length; i++) {
    hash = (hash * BigInt(31) + BigInt(contentId.charCodeAt(i))) % (BigInt(2) ** BigInt(128));
  }
  return `${hash}field`;
}
