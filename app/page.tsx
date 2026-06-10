import Link from "next/link";
import {
  Zap,
  Users,
  HandCoins,
  WifiOff,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { FlipWord } from "@/components/FlipWord";
import { cn } from "@/lib/utils";

// ─── Decorative app preview (aria-hidden, purely visual) ─────────────────────

function BalancePreview() {
  const members = [
    { initials: "MS", name: "Maria Santos", note: "is owed", amt: "₱800.00", color: "text-credit" },
    { initials: "CR", name: "Carlo Reyes", note: "owes the house", amt: "−₱350.00", color: "text-debit" },
    { initials: "TL", name: "Tricia Lim", note: "all settled up", amt: "₱0.00", color: "text-muted" },
  ];

  return (
    <div
      aria-hidden="true"
      className="paper-card float relative overflow-hidden select-none"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-credit opacity-15 blur-3xl" />

      <div className="relative p-7 sm:p-8">
        <p className="eyebrow">Your balance</p>
        <p className="tnum mt-3 font-display text-[2.6rem] font-semibold leading-none tracking-tight text-credit">
          ₱2,450.00
        </p>
        <p className="mt-2 text-sm text-muted">the house owes you, all in.</p>

        <div className="mt-5 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gold-deep px-4 py-2 text-sm font-medium text-white">
            Add expense
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink">
            Settle up
          </span>
        </div>

        <ul className="mt-5 flex flex-col">
          {members.map((m, i) => (
            <li
              key={m.initials}
              className={cn("flex items-center gap-3 py-3.5", i > 0 && "tear")}
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[11px] font-semibold text-gold-deep">
                {m.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                <p className="text-xs text-muted">{m.note}</p>
              </div>
              <span className={cn("tnum shrink-0 text-sm font-semibold", m.color)}>
                {m.amt}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Create or join a house",
    desc: "Share a 6-character invite code with your boardmates. They type it or scan a QR code. Everyone lands in the same ledger instantly.",
  },
  {
    num: "02",
    title: "Log shared expenses",
    desc: "Add the Meralco bill, groceries, internet. Split equally by default, or enter custom amounts when the split isn't even.",
  },
  {
    num: "03",
    title: "Settle up cleanly",
    desc: "The app calculates the fewest transfers to zero everyone out. Tap to record when someone pays. Done.",
  },
];

const FEATURES = [
  {
    Icon: Zap,
    title: "Live balances, always in sync",
    desc: "Everyone sees the same number, always up to date. Open the app, check your balance. That's it.",
    prominent: true,
  },
  {
    Icon: Users,
    title: "Equal or custom splits",
    desc: "Divide equally by default or enter custom amounts per person.",
    prominent: false,
  },
  {
    Icon: HandCoins,
    title: "Simplified settlements",
    desc: "Fewest possible payments to square everyone out.",
    prominent: false,
  },
  {
    Icon: WifiOff,
    title: "Works offline",
    desc: "Check your balance without signal. Syncs when you reconnect.",
    prominent: false,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark size="sm" />
          <nav className="flex items-center gap-1">
            <Link
              href="/auth"
              className="px-3 py-2 text-sm font-medium text-muted transition hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/auth"
              className={cn(buttonVariants({ variant: "gold", size: "sm" }))}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_420px] lg:gap-16">
            {/* Text */}
            <div>
              <p className="eyebrow">For boarding houses</p>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.5rem]">
                Split the rent.
                <br />
                Track the <FlipWord />.
                <br />
                <span className="text-gold-deep">No drama.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
                A shared-expense ledger built for boarding-house boardmates. Add
                bills, see who owes what, and settle up. No more awkward
                group-chat math.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className={cn(buttonVariants({ variant: "gold", size: "lg" }))}
                >
                  Create your house
                </Link>
                <Link
                  href="/auth"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted">
                Free to use. No credit card needed.
              </p>
            </div>

            {/* App preview */}
            <div>
              <BalancePreview />
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Up and running in minutes
            </h2>

            <div className="mt-14 grid gap-12 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.num}>
                  <span className="font-display text-[5rem] font-semibold leading-none tracking-tight text-gold/25">
                    {step.num}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 max-w-sm font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Everything a boarding house actually needs
          </h2>

          {/* Asymmetric grid: 1 prominent + 3 supporting */}
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {/* Prominent feature — full first column */}
            {(() => {
              const MainIcon = FEATURES[0].Icon;
              return (
            <div className="paper-card flex flex-col gap-4 p-7 sm:p-8 lg:row-span-2">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-gold-deep">
                <MainIcon className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold text-ink">{FEATURES[0].title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">
                {FEATURES[0].desc}
              </p>
              <div className="mt-auto pt-4">
                <div className="rounded-xl bg-paper-deep px-4 py-3">
                  <p className="eyebrow mb-2">House total this month</p>
                  <p className="tnum font-display text-3xl font-semibold text-ink">
                    ₱8,240.00
                  </p>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-paper">
                    <span className="bg-cat-rent" style={{ width: "38%" }} />
                    <span className="bg-cat-electric" style={{ width: "22%" }} />
                    <span className="bg-cat-grocery" style={{ width: "28%" }} />
                    <span className="bg-cat-internet" style={{ width: "12%" }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {[
                      { color: "bg-cat-rent", label: "Rent" },
                      { color: "bg-cat-electric", label: "Electric" },
                      { color: "bg-cat-grocery", label: "Grocery" },
                      { color: "bg-cat-internet", label: "Internet" },
                    ].map((c) => (
                      <span key={c.label} className="inline-flex items-center gap-1 text-xs text-ink-soft">
                        <span className={cn("h-2 w-2 rounded-full", c.color)} />
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
              );
            })()}

            {/* Supporting features */}
            {FEATURES.slice(1).map((f) => (
              <div key={f.title} className="paper-card flex flex-col gap-3 p-6 sm:p-7">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-soft text-gold-deep">
                  <f.Icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="font-semibold text-ink">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonial ─────────────────────────────────────────────────── */}
        <section className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
            <p className="font-display text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl">
              "Before this, every month was a group chat full of &lsquo;bayad
              na ba?&rsquo; Now we just check the app and settle in one go."
            </p>
            <p className="mt-6 text-sm text-muted">
              Tricia M., Unit 4B, Quezon City
            </p>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            No spreadsheets.
            <br />
            No awkward reminders.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-lg text-muted">
            Just a clean ledger, shared with your house.
          </p>
          <Link
            href="/auth"
            className={cn(
              buttonVariants({ variant: "gold", size: "lg" }),
              "mt-8 inline-flex gap-2",
            )}
          >
            Create your house, it&apos;s free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <Wordmark size="sm" />
          <p className="text-sm text-muted">
            © 2025 KwartoKwarta. Built for boarding houses.
          </p>
        </div>
      </footer>
    </div>
  );
}
