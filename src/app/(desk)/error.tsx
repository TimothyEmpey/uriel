"use client";

export default function DeskError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel p-5">
      <h1 className="text-xl font-semibold">The desk could not load</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {process.env.NODE_ENV === "development" ? error.message : "Check that Postgres is running, then retry."}
      </p>
      <button className="mt-4 rounded-full bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]" onClick={reset} type="button">
        Retry
      </button>
    </div>
  );
}
