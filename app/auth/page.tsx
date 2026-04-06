"use client";

import { useAleoWallet } from "@/app/hooks/useAleoWallet";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signMessage } from "@/app/lib/aleo-adapter";

export default function AuthPage() {
  const { connected, address, network, connecting, error, installed, checking, connect } = useAleoWallet();
  const router = useRouter();

  // Once connected, sign a message and create a session
  useEffect(() => {
    if (!connected || !address) return;

    async function createSession() {
      try {
        // Sign a challenge so the backend knows you own this address
        const message = `VideoChain login: ${address} at ${Date.now()}`;
        let signature: string | undefined;

        try {
          signature = await signMessage(message);
        } catch {
          // In dev mode, signature is optional
          console.warn("Signature skipped — dev mode");
        }

        const res = await fetch("/api/auth/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ aleoAddress: address, network, signature }),
        });

        const json = await res.json();
        if (json.success) {
          router.push("/browse");
        }
      } catch (err) {
        console.error("Session creation failed", err);
      }
    }

    createSession();
  }, [connected, address, network, router]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <span className="text-5xl">⬡</span>
          <h1 className="mt-4 text-2xl font-bold text-white">
            Connect to VideoChain
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Use your Aleo wallet to sign in privately.
            No email, no password — your wallet is your identity.
          </p>
        </div>

        <div className="card flex flex-col gap-4">
          {checking ? (
            <p className="text-sm text-gray-400 text-center">Checking for Leo Wallet…</p>
          ) : !installed ? (
            <>
              <p className="text-sm text-yellow-400">
                Leo Wallet is not installed.
              </p>
              <a
                href="https://leo.app"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Install Leo Wallet
              </a>
              <p className="text-xs text-gray-500">
                After installing, refresh this page.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={connect}
                disabled={connecting || connected}
                className="btn-primary"
              >
                {connecting
                  ? "Connecting…"
                  : connected
                  ? "Connected ✓"
                  : "Connect Leo Wallet"}
              </button>

              {connected && address && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">Connected as</p>
                  <p className="mt-1 break-all text-xs text-brand-400">{address}</p>
                  <p className="mt-2 text-xs text-gray-500">Signing in…</p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-600">
          Your Aleo address is your identity. No personal data is stored.
        </p>
      </div>
    </div>
  );
}
