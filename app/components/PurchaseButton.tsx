"use client";

import { useState } from "react";
import { api } from "@/app/lib/api";
import { useToastContext } from "./Toast";
import { useAleoWallet } from "@/app/hooks/useAleoWallet";
import { executeGrantAccess } from "@/app/lib/aleo-adapter";
import type { AccessType } from "@/types";

interface Props {
  contentId: string;
  price: number;
  accessType: AccessType;
  onSuccess?: () => void;
}

export function PurchaseButton({ contentId, price, accessType, onSuccess }: Props) {
  const { addToast } = useToastContext();
  const { connected, address, connect } = useAleoWallet();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string | null>(null);

  async function handlePurchase() {
    if (!connected || !address) {
      await connect();
      return;
    }

    setLoading(true);
    try {
      // Step 1: Record purchase on backend
      setStep("Processing payment…");
      const res = await api.purchase.create({ contentId, accessType });

      if (!res.success || !res.data) {
        addToast(res.error ?? "Purchase failed", "error");
        return;
      }

      // Step 2: Execute grant_access on Aleo via Leo Wallet
      // This creates a private AccessRecord in the user's wallet
      if (res.data.aleoGrantInputs) {
        setStep("Creating Aleo entitlement — check your Leo Wallet…");
        try {
          const { txId } = await executeGrantAccess(res.data.aleoGrantInputs);
          addToast(`Access granted! Aleo tx: ${txId.slice(0, 16)}…`, "success");
        } catch (aleoErr) {
          // Aleo execution failed but purchase was recorded
          // User can retry the grant_access later
          console.warn("Aleo grant_access failed:", aleoErr);
          addToast(
            "Purchase recorded but Aleo entitlement pending. Try watching to retry.",
            "warning"
          );
        }
      } else {
        addToast("Access granted!", "success");
      }

      onSuccess?.();
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setLoading(false);
      setStep(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading
          ? step ?? "Processing…"
          : !connected
          ? "Connect wallet to purchase"
          : `Unlock for $${price.toFixed(2)}`}
      </button>
      {loading && (
        <p className="text-center text-xs text-gray-500">
          {step?.includes("Leo Wallet")
            ? "A popup will appear in your Leo Wallet extension"
            : "Please wait…"}
        </p>
      )}
    </div>
  );
}
