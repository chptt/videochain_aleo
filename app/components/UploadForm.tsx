"use client";

import { useState, useRef } from "react";
import { useToastContext } from "./Toast";
import { encryptVideo } from "@/app/lib/client-upload";
import type { AccessType } from "@/types";

const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: "PAY_PER_VIEW",  label: "Pay-per-view" },
  { value: "RENTAL",        label: "Rental" },
  { value: "LIMITED_VIEWS", label: "Limited views" },
  { value: "SUBSCRIPTION",  label: "Subscription" },
  { value: "LIFETIME",      label: "Lifetime" },
];

type Stage = "idle" | "encrypting" | "uploading" | "saving" | "done";

export function UploadForm() {
  const { addToast } = useToastContext();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", description: "", category: "",
    price: "0", accessType: "PAY_PER_VIEW" as AccessType,
    maxViews: "", rentalHours: "",
  });
  const [stage, setStage]       = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return addToast("Select a video file", "error");

    try {
      // 1. Encrypt in browser
      setStage("encrypting");
      setProgress(5);
      const { encryptedBlob, keyHex, ivHex, tagHex, contentHashHex } = await encryptVideo(file);

      // 2. Convert encrypted blob to structured data URI (stored in DB)
      setStage("uploading");
      setProgress(10);
      // Store as structured JSON payload matching server-side EncryptedPayload format
      const encryptedPayload = {
        iv: ivHex,
        tag: tagHex,
        // ciphertext is the blob minus the last 16 bytes (tag)
        ciphertext: await encryptedBlob.slice(0, encryptedBlob.size - 16).arrayBuffer()
          .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("")),
      };
      const encryptedVideoUri = `data:application/json;base64,${btoa(JSON.stringify(encryptedPayload))}`;
      setProgress(90);

      // 3. Register with backend (tiny JSON payload — no video bytes)
      setStage("saving");
      setProgress(92);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          encryptedVideoUri,
          keyHex,
          ivHex,
          contentHashHex,
          title:       form.title || "Untitled",
          description: form.description || undefined,
          category:    form.category || undefined,
          price:       parseFloat(form.price) || 0,
          accessType:  form.accessType,
          maxViews:    form.maxViews ? parseInt(form.maxViews) : undefined,
          rentalHours: form.rentalHours ? parseInt(form.rentalHours) : undefined,
        }),
      }).then((r) => r.json());

      setProgress(100);

      if (res.success) {
        addToast("Video encrypted and uploaded successfully", "success");
        setForm({ title: "", description: "", category: "", price: "0", accessType: "PAY_PER_VIEW", maxViews: "", rentalHours: "" });
        if (fileRef.current) fileRef.current.value = "";
      } else {
        addToast(res.error ?? "Upload failed", "error");
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Upload error", "error");
    } finally {
      setStage("idle");
      setProgress(0);
    }
  }

  const busy = stage !== "idle";
  const stageLabel: Record<Stage, string> = {
    idle:       "Upload video",
    encrypting: "Encrypting…",
    uploading:  "Uploading to Walrus…",
    saving:     "Saving…",
    done:       "Done",
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm text-gray-400">Video file</label>
        <input ref={fileRef} type="file" accept="video/*" className="input" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-400">Title</label>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} className="input" required placeholder="Video title" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-400">Description</label>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="input min-h-[80px]" placeholder="What's this video about?" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-gray-400">Category</label>
          <input value={form.category} onChange={(e) => set("category", e.target.value)} className="input" placeholder="e.g. Tutorial" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-400">Price (USD)</label>
          <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-400">Access type</label>
        <select value={form.accessType} onChange={(e) => set("accessType", e.target.value)} className="input">
          {ACCESS_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      {form.accessType === "LIMITED_VIEWS" && (
        <div>
          <label className="mb-1 block text-sm text-gray-400">Max views</label>
          <input type="number" min="1" value={form.maxViews} onChange={(e) => set("maxViews", e.target.value)} className="input" />
        </div>
      )}
      {form.accessType === "RENTAL" && (
        <div>
          <label className="mb-1 block text-sm text-gray-400">Rental duration (hours)</label>
          <input type="number" min="1" value={form.rentalHours} onChange={(e) => set("rentalHours", e.target.value)} className="input" />
        </div>
      )}
      {busy && (
        <div className="flex flex-col gap-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-600">
            <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400">{stageLabel[stage]} {progress}%</p>
        </div>
      )}
      <button type="submit" disabled={busy} className="btn-primary">
        {stageLabel[stage]}
      </button>
    </form>
  );
}
