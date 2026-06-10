"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useActiveHouse, storeHouseId } from "@/lib/hooks/useActiveHouse";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Wordmark } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";

function FullScreenSpinner() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Spinner size={28} />
    </main>
  );
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, signOutUser } = useAuth();
  const active = useActiveHouse(user?.uid ?? null);

  const invite = params.get("invite")?.toUpperCase() ?? "";
  const [tab, setTab] = useState<"create" | "join">(invite ? "join" : "create");
  const [houseName, setHouseName] = useState("");
  const [code, setCode] = useState(invite);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (active.houseId) router.replace("/house");
  }, [active.houseId, router]);

  if (loading || !user) return <FullScreenSpinner />;
  if (active.houseId) return <FullScreenSpinner />;
  // Still confirming whether the user already has a house.
  if (!active.resolved && !active.error && !active.noHouse) {
    return <FullScreenSpinner />;
  }

  async function createHouse(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { houseId, inviteCode } = await api.createHouse(houseName);
      storeHouseId(houseId); // §10.2 — seed before navigating
      toast.success(`House created — invite code ${inviteCode}`);
      router.push("/house");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create house");
      setBusy(false);
    }
  }

  async function joinHouse(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { houseId } = await api.joinHouse(code);
      storeHouseId(houseId);
      toast.success("Joined the house!");
      router.push("/house");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't join house");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <button
          type="button"
          onClick={() => signOutUser()}
          className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Sign out
        </button>
      </header>

      <div className="flex flex-1 flex-col justify-center py-14">
        <p className="eyebrow">
          {user.displayName ? `Hi, ${user.displayName.split(" ")[0]}` : "Welcome"}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          Set up your house
        </h1>
        <p className="mt-3 text-base text-muted leading-relaxed">
          Create a new house for your boarding place, or join one with an invite
          code.
        </p>

        <div className="mt-8">
          <Segmented
            className="w-full [&>button]:flex-1"
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "create", label: "Create" },
              { value: "join", label: "Join" },
            ]}
          />
        </div>

        {tab === "create" ? (
          <form onSubmit={createHouse} className="mt-7 flex flex-col gap-5">
            <div>
              <Label htmlFor="houseName">House name</Label>
              <Input
                id="houseName"
                placeholder="e.g. Unit 4B Boarding House"
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                required
                maxLength={50}
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              size="lg"
              disabled={busy || !houseName.trim()}
            >
              <PlusCircle className="h-4.5 w-4.5" />
              {busy ? "Creating…" : "Create house"}
            </Button>
          </form>
        ) : (
          <form onSubmit={joinHouse} className="mt-7 flex flex-col gap-5">
            <div>
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                placeholder="6-character code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                maxLength={6}
                autoCapitalize="characters"
                className="text-center font-mono text-xl tracking-[0.3em]"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              size="lg"
              disabled={busy || code.trim().length !== 6}
            >
              <LogIn className="h-4.5 w-4.5" />
              {busy ? "Joining…" : "Join house"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Onboarding />
    </Suspense>
  );
}
