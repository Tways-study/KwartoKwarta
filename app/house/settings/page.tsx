"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  useActiveHouse,
  clearStoredHouseId,
} from "@/lib/hooks/useActiveHouse";
import { useHouse, useMembers } from "@/lib/hooks/firestore";
import { api } from "@/lib/api";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Sheet } from "@/components/ui/sheet";
import { InviteCard } from "@/components/InviteCard";
import { MembersCard } from "@/components/MembersCard";
import { LoadErrorScreen } from "@/components/LoadErrorScreen";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOutUser } = useAuth();
  const active = useActiveHouse(user?.uid ?? null);
  const houseId = active.houseId;
  const house = useHouse(houseId);
  const members = useMembers(houseId);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (active.noHouse) router.replace("/onboarding");
  }, [active.noHouse, router]);

  if (authLoading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  if ((active.error || house.error) && !house.data) {
    return (
      <LoadErrorScreen
        onRetry={() => window.location.reload()}
        onSignOut={() => signOutUser()}
      />
    );
  }

  if (!house.data) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  async function leave() {
    setLeaving(true);
    try {
      await api.leaveHouse();
      clearStoredHouseId();
      toast.success("You left the house");
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't leave");
      setLeaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-28 sm:pb-10">
      <Link
        href="/house"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-ink">
        {house.data.name}
      </h1>
      <p className="mt-2 text-base text-muted">
        {house.data.memberCount}{" "}
        {house.data.memberCount === 1 ? "boardmate" : "boardmates"} · House
        settings
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <div>
          <CardEyebrow>Invite</CardEyebrow>
          <InviteCard code={house.data.inviteCode} />
        </div>

        <MembersCard members={members.data} meUid={user.uid} />

        <Card className="border-debit/30">
          <CardEyebrow className="text-debit">Danger zone</CardEyebrow>
          <CardTitle>Leave this house</CardTitle>
          <p className="mt-1.5 text-sm text-muted">
            You&apos;ll stop seeing this house&apos;s ledger. Any balance you
            have won&apos;t be cleared automatically — settle up first.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => setConfirmLeave(true)}
          >
            <DoorOpen className="h-4 w-4" />
            Leave house
          </Button>
        </Card>
      </div>

      <Sheet
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave this house?"
        description="You can re-join later with the invite code."
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmLeave(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={leave}
              disabled={leaving}
            >
              {leaving ? "Leaving…" : "Yes, leave"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-soft">
          This removes you from <strong>{house.data.name}</strong>. Your
          recorded expenses stay in the ledger for the others.
        </p>
      </Sheet>
    </main>
  );
}
