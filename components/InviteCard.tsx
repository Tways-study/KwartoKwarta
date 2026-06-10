"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function InviteCard({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  // Rendered client-side only (after house data loads), so window is available.
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?invite=${code}`
      : `/?invite=${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Invite code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — long-press to select it.");
    }
  }

  return (
    <div
      className={cn(
        "paper-card flex flex-col items-center gap-5 p-7 sm:flex-row sm:gap-7",
        className,
      )}
    >
      <div className="rounded-xl border border-line bg-white p-2.5">
        <QRCodeSVG
          value={joinUrl}
          size={96}
          bgColor="#ffffff"
          fgColor="#211c16"
          level="M"
        />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="eyebrow">House invite code</p>
        <button
          type="button"
          onClick={copy}
          className="group mt-1 inline-flex items-center gap-2.5"
          aria-label="Copy invite code"
        >
          <span className="font-mono text-3xl font-bold tracking-[0.32em] text-ink">
            {code}
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition group-hover:bg-paper-deep group-hover:text-gold-deep">
            {copied ? (
              <Check className="h-4 w-4 text-credit" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </span>
        </button>
        <p className="mt-1 text-sm text-muted">
          Share the code or let a boardmate scan the QR to join.
        </p>
      </div>
    </div>
  );
}
