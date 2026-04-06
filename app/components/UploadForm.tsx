
"use client";

import { useState, useRef } from "react";
import { api } from "@/app/lib/api";
import { useToastContext } from "./Toast";
import type { AccessType } from "@/types";

const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: "PAY_PER_VIEW", label: "Pay-per-view" },
  { value: "RENTAL",       label: "Rental" },
  { value: "LIMITED_VIEWS",label: "Limited views" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "LIFETIME",     label: "Lifetime" },
];

export function UploadForm() {
  const { addToast } = useToastContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", description: "", category: "",
    price: "0", accessType: "PAY_PER_VIEW" as AccessType,
    maxViews: "", rentalHours: "",
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return addToast("Select a video file", "error");

    setUploading(true);
    setProgress(10);

    try {
      const fd = new FormData();
      fd.append("video", file);
      if (thumbRef.current?.files?.[0]) fd.append("thumbnail", thumbRef.current.files[0]);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("price", form.price);
      fd.append("accessType", form.accessType);
      if (form.maxViews) fd.append("maxViews", form.maxViews);
      if (form.rentalHours) fd.append("rentalHours", form.rentalHours);

      setProgress(40);
      const res = await api.upload.create(fd);
      setProgress(100);

      if (res.success) {
        addToast("Video uploaded and encrypted successfully", "success");
        setForm({ title: "", description: "", category: "", price: "0", accessType: "PAY_PER_VIEW", maxViews: "", rentalHours: "" });
      } else {
        addToast(res.error ?? "Upload failed", "error");
      }
    } catch {
      addToast("Upload error", "error");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm text-gray-400">Video file</label>
        <input ref={fileRef} type="file" accept="video/*" className="input" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-400">Thumbnail (optional)</label>
        <input ref={thumbRef} type="file" accept="image/*" className="input" />
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
      {uploading && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-600">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <button type="submit" disabled={uploading} className="btn-primary">
        {uploading ? "Encrypting & uploading…" : "Upload video"}
      </button>
    </form>
  );
}
