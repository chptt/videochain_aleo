"use client";

/**
 * Aleo adapter — direct window API calls to Leo Wallet.
 * Leo Wallet may inject under different property names depending on version.
 */

export interface AleoWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWallet = any;

function getLeoWallet(): AnyWallet | undefined {
  if (typeof window === "undefined") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  // Try all known injection points
  return w.leoWallet ?? w.leo ?? w.aleo ?? w.AleoWallet ?? undefined;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;

  // Log what's available for debugging
  console.log("[Aleo] window keys with 'leo':", Object.keys(w).filter(k => k.toLowerCase().includes('leo') || k.toLowerCase().includes('aleo')));

  const leo = getLeoWallet();
  if (!leo) {
    throw new Error("Leo Wallet not found. Please install it from https://leo.app and refresh the page.");
  }

  console.log("[Aleo] Wallet found:", leo);
  console.log("[Aleo] Wallet methods:", Object.keys(leo));

  // Try different connect methods
  if (typeof leo.connect === "function") {
    await leo.connect("testnet");
  } else if (typeof leo.requestAccounts === "function") {
    await leo.requestAccounts();
  } else if (typeof leo.enable === "function") {
    await leo.enable();
  }

  // Try different ways to get the address
  let address: string | null = null;

  if (typeof leo.getAccount === "function") {
    const account = await leo.getAccount();
    address = account?.address ?? account ?? null;
  } else if (typeof leo.getAccounts === "function") {
    const accounts = await leo.getAccounts();
    address = accounts?.[0] ?? null;
  } else if (leo.publicKey) {
    address = leo.publicKey;
  }

  if (!address) {
    throw new Error("Could not get address from Leo Wallet");
  }

  return { connected: true, address, network: "testnet" };
}

export async function getAleoWalletState(): Promise<AleoWalletState> {
  const leo = getLeoWallet();
  if (!leo) return { connected: false, address: null, network: null };
  try {
    let address: string | null = null;
    if (typeof leo.getAccount === "function") {
      const account = await leo.getAccount();
      address = account?.address ?? account ?? null;
    } else if (typeof leo.getAccounts === "function") {
      const accounts = await leo.getAccounts();
      address = accounts?.[0] ?? null;
    } else if (leo.publicKey) {
      address = leo.publicKey;
    }
    if (address) return { connected: true, address, network: "testnet" };
  } catch { /* not connected */ }
  return { connected: false, address: null, network: null };
}

export async function disconnectAleoWallet(): Promise<void> {
  const leo = getLeoWallet();
  if (leo && typeof leo.disconnect === "function") await leo.disconnect();
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
  const account = await leo.getAccount?.() ?? { address: "" };
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
  const account = await leo.getAccount?.() ?? { address: "" };
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
  const account = await leo.getAccount?.() ?? { address: "" };
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

export function contentIdToField(contentId: string): string {
  let hash = BigInt(0);
  for (let i = 0; i < contentId.length; i++) {
    hash = (hash * BigInt(31) + BigInt(contentId.charCodeAt(i))) % (BigInt(2) ** BigInt(128));
  }
  return `${hash}field`;
}
