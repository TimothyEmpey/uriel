"use server";

import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/server/db";
import { flattenAgentTrades } from "@/server/trading";

async function requireAccount() {
  const session = await auth();
  if (!session?.user) throw new Error("Sign in required.");
  const account = await prisma.account.findFirst();
  if (!account) throw new Error("No paper account is set up.");
  return account;
}

export async function authenticate(formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "That email or password did not match." };
    throw error;
  }
}

export async function signOutDesk() {
  await signOut({ redirectTo: "/login" });
}

export async function togglePause() {
  const account = await requireAccount();
  const paused = !account.agentPaused;
  await prisma.account.update({ where: { id: account.id }, data: { agentPaused: paused } });
  await prisma.agentEvent.create({
    data: {
      accountId: account.id,
      kind: "CONTROL",
      level: "info",
      message: paused ? "Uriel paused. No new entries." : "Uriel resumed. Entries follow the risk engine.",
    },
  });
  revalidatePath("/", "layout");
}

export async function flattenNow() {
  const account = await requireAccount();
  const closed = await flattenAgentTrades(account.id, new Date(), "FLATTEN");
  await prisma.agentEvent.create({
    data: {
      accountId: account.id,
      kind: "FLATTEN",
      level: "info",
      message: closed ? `Flattened ${closed} SPY day trade${closed === 1 ? "" : "s"}.` : "No agent SPY position was open.",
    },
  });
  revalidatePath("/", "layout");
}
