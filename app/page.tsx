
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 py-32 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-transparent pointer-events-none" />
        <span className="mb-4 rounded-full border border-brand-500/30 bg-brand-900/30 px-3 py-1 text-xs text-brand-400">
          Powered by Aleo — Zero-Knowledge Entitlement
        </span>
        <h1 className="mb-6 max-w-3xl text-5xl font-bold tracking-tight text-white">
          Private video access,{" "}
          <span className="text-brand-400">provably yours</span>
        </h1>
        <p className="mb-10 max-w-xl text-lg text-gray-400">
          VideoChain uses Aleo's zero-knowledge proofs to verify your access rights
          without revealing who you are or what you own. Encrypted storage, short-lived
          sessions, no raw URLs.
        </p>
        <div className="flex gap-4">
          <Link href="/browse" className="btn-primary text-base px-6 py-3">
            Browse Videos
          </Link>
          <Link href="/auth" className="btn-secondary text-base px-6 py-3">
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "🔐",
              title: "Client-side encryption",
              desc: "Video is AES-256-GCM encrypted in your browser before upload. The server never sees plaintext.",
            },
            {
              icon: "🧾",
              title: "Aleo entitlement",
              desc: "Access rights live as private records on Aleo. Only you can prove ownership — no public ledger exposure.",
            },
            {
              icon: "⏱️",
              title: "Short-lived sessions",
              desc: "The backend releases a wrapped key only after verifying your Aleo proof. Sessions expire in minutes.",
            },
          ].map((f) => (
            <div key={f.title} className="card flex flex-col gap-3">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Access types */}
      <section className="border-t border-gray-800 bg-surface-800 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">Flexible access models</h2>
          <p className="mb-10 text-gray-400">Creators choose how viewers unlock their content.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Pay-per-view", "Rental", "Limited views", "Subscription", "Lifetime"].map((t) => (
              <span key={t} className="badge-blue text-sm px-4 py-1.5">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">Ready to create or watch?</h2>
        <p className="mb-8 text-gray-400">Join VideoChain and experience truly private video access.</p>
        <Link href="/auth" className="btn-primary text-base px-8 py-3">
          Connect & Start
        </Link>
      </section>
    </div>
  );
}
