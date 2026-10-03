"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/actions";
import { UrielMark } from "@/components/uriel-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(
    async (_previous: { error?: string } | null, formData: FormData) => (await authenticate(formData)) ?? null,
    null,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <UrielMark tone="idle" />
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Uriel</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Open the desk</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Paper trading starts here. Live Robinhood orders stay off until you arm them.
      </p>
      <form action={action} className="mt-8 space-y-3">
        <label className="block text-sm">
          Email
          <Input className="mt-1" name="email" type="email" autoComplete="username" required defaultValue="operator@uriel.local" />
        </label>
        <label className="block text-sm">
          Password
          <Input className="mt-1" name="password" type="password" autoComplete="current-password" required />
        </label>
        {state?.error ? <p className="text-sm text-[var(--negative)]">{state.error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking" : "Enter"}
        </Button>
      </form>
    </main>
  );
}
