
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/app/components/Navbar";
import { ToastProvider } from "@/app/components/Toast";

export const metadata: Metadata = {
  title: "VideoChain — Private Video Access",
  description: "Privacy-preserving premium video platform powered by Aleo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
