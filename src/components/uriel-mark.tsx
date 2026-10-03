export function UrielMark({ tone }: { tone: "live" | "paused" | "halted" | "idle" }) {
  const color = {
    live: "var(--positive)",
    paused: "#d97706",
    halted: "var(--negative)",
    idle: "var(--primary)",
  }[tone];

  return (
    <div className="uriel-perch" aria-hidden>
      <div className="uriel-float">
        {/* Raw img so the blend mode and rotation are not wrapped by the image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uriel.webp" alt="" />
      </div>
      <span className="uriel-dot" style={{ background: color }} />
    </div>
  );
}
