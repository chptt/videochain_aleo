
import { UploadForm } from "@/app/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload a video</h1>
        <p className="mt-1 text-sm text-gray-400">
          Your video is encrypted client-side before upload. The server never sees plaintext.
        </p>
      </div>
      <div className="card">
        <UploadForm />
      </div>
    </div>
  );
}
