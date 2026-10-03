import { DeskShell } from "@/components/desk-shell";
import { getDesk } from "@/server/desk";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const desk = await getDesk();
  const tone = desk?.haltReason ? "halted" : desk?.paused ? "paused" : desk?.clock.tradingDay ? "live" : "idle";
  return <DeskShell tone={tone}>{children}</DeskShell>;
}
