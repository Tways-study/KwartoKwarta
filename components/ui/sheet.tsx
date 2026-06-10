"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// A modal that rises from the bottom on mobile and centers on larger screens.
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 w-full sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg",
            "max-h-[92dvh] overflow-y-auto border border-line bg-surface shadow-lift",
            "rounded-t-3xl sm:rounded-3xl",
            "transition duration-300 ease-out",
            "data-[starting-style]:translate-y-5 data-[starting-style]:opacity-0",
            "data-[ending-style]:translate-y-5 data-[ending-style]:opacity-0",
          )}
        >
          <div className="sticky top-0 z-10 flex items-start gap-3 rounded-t-3xl bg-surface/95 px-5 pb-3 pt-5 backdrop-blur sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
              <Dialog.Title className="font-display text-xl font-semibold tracking-tight text-ink">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className="-mr-1 mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-paper-deep hover:text-ink"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="px-5 pb-5 sm:px-6">{children}</div>

          {footer ? (
            <div className="sticky bottom-0 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:px-6">
              {footer}
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
