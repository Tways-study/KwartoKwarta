import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-4 sm:px-8">
        <Wordmark size="sm" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <span className="font-display text-[8rem] font-semibold leading-none tracking-tight text-gold/20">
          404
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-2 text-base text-muted">
          The link might be wrong, or this page was moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "gold", size: "lg" }))}
          >
            Go home
          </Link>
          <Link
            href="/house"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
