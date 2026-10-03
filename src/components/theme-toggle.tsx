"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const order = ["system", "light", "dark"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = order.includes(theme as (typeof order)[number]) ? (theme as (typeof order)[number]) : "system";
  const label = mounted ? current : "system";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const index = order.indexOf(current);
        setTheme(order[(index + 1) % order.length]);
      }}
      aria-label={`Theme ${label}. Activate to change.`}
    >
      {label}
    </Button>
  );
}
