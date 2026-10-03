"use client";

import { useEffect, useRef, useState } from "react";

type Tone = "live" | "paused" | "halted" | "idle";
type Pose =
  | "idle"
  | "walk"
  | "look"
  | "happy"
  | "sit"
  | "sleep"
  | "eat"
  | "magic"
  | "walk-left"
  | "disappointed";

const sprite: Record<Pose, string> = {
  idle: "/uriel/idle.png",
  walk: "/uriel/walk.png",
  look: "/uriel/look.png",
  happy: "/uriel/happy.png",
  sit: "/uriel/sit.png",
  sleep: "/uriel/sleep.png",
  eat: "/uriel/eat.png",
  magic: "/uriel/magic.png",
  "walk-left": "/uriel/walk-left.png",
  disappointed: "/uriel/disappointed.png",
};

const bubble: Partial<Record<Pose, string>> = {
  happy: "/uriel/badge-happy.png",
  eat: "/uriel/badge-hungry.png",
  sleep: "/uriel/badge-sleepy.png",
  magic: "/uriel/badge-magic.png",
  sit: "/uriel/badge-play.png",
};

function moods(tone: Tone): Pose[] {
  if (tone === "halted") return ["disappointed", "disappointed", "sit", "look"];
  if (tone === "paused") return ["sit", "look", "idle", "eat", "disappointed"];
  if (tone === "idle") return ["sleep", "sleep", "sit", "idle", "look", "eat"];
  return ["happy", "magic", "look", "idle", "eat", "sit", "happy"];
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function UrielMark({ tone }: { tone: Tone }) {
  const toneRef = useRef(tone);
  toneRef.current = tone;
  const roamRef = useRef<() => void>(() => {});
  const petRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const posRef = useRef({ x: 0, y: 0 });
  const [pose, setPose] = useState<Pose>("idle");
  const [flip, setFlip] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [travel, setTravel] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const box = () => {
      const narrow = window.innerWidth < 640;
      const size = narrow ? 64 : 84;
      const margin = narrow ? 8 : 12;
      // Header reserves pr-20 / pr-28. He paces inside that top-right slot.
      const column = narrow ? 80 : 112;
      const y = margin;
      const maxX = Math.max(margin, window.innerWidth - size - margin);
      const minX = Math.min(maxX, Math.max(margin, window.innerWidth - column));
      return { minX, minY: y, maxX, maxY: y, homeX: maxX, homeY: y };
    };
    const place = (next: { x: number; y: number }, ms: number) => {
      posRef.current = next;
      setPos(next);
      setTravel(ms);
    };
    const parkedPose = (value: Tone): Pose =>
      value === "halted" ? "disappointed" : value === "paused" ? "sit" : value === "idle" ? "sleep" : "idle";

    let stopped = false;
    const later = (fn: () => void, ms: number) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!stopped) fn();
      }, ms);
    };

    const emote = () => {
      const next = pick(moods(toneRef.current));
      setPose(next);
      const hold = next === "sleep" ? 4200 + Math.random() * 3600 : 1600 + Math.random() * 2600;
      later(() => roamRef.current(), hold);
    };

    const roam = () => {
      if (media.matches) return;
      const area = box();
      const current = posRef.current;
      let dest = current;
      let dist = 0;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const goHome = attempt > 0 && Math.random() < 0.22;
        dest = {
          x: goHome ? area.homeX : area.minX + Math.random() * (area.maxX - area.minX),
          y: goHome ? area.homeY : area.minY + Math.random() * (area.maxY - area.minY),
        };
        dist = Math.hypot(dest.x - current.x, dest.y - current.y);
        if (dist >= 8) break;
      }
      if (dist < 4) {
        emote();
        return;
      }
      const dx = dest.x - current.x;
      const left = dx < 0;
      setFlip(left);
      setPose(left ? "walk-left" : "walk");
      const ms = Math.min(6800, Math.max(900, (dist / 70) * 1000));
      place(dest, ms);
      later(emote, ms + 30);
    };
    roamRef.current = roam;

    const home = box();
    place({ x: home.homeX, y: home.homeY }, 0);
    setPose(media.matches ? parkedPose(toneRef.current) : "idle");
    setReady(true);

    if (!media.matches) later(roam, 800);

    const onPet = (event: PointerEvent) => {
      const node = petRef.current;
      if (!node || media.matches) return;
      const rect = node.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) return;
      setPose("happy");
      setTravel(0);
      later(() => roamRef.current(), 1400);
    };

    const onResize = () => {
      const area = box();
      const current = posRef.current;
      place(
        {
          x: Math.min(Math.max(area.minX, current.x), area.maxX),
          y: Math.min(Math.max(area.minY, current.y), area.maxY),
        },
        0,
      );
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointerdown", onPet);
    return () => {
      stopped = true;
      window.clearTimeout(timer.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onPet);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPose(tone === "halted" ? "disappointed" : tone === "paused" ? "sit" : tone === "idle" ? "sleep" : "idle");
  }, [tone, ready]);

  const walking = pose === "walk" || pose === "walk-left";
  const mood = bubble[pose];

  return (
    <div
      ref={petRef}
      className={ready ? "uriel-pet" : "uriel-pet uriel-pet-home"}
      style={ready ? { transform: `translate(${pos.x}px, ${pos.y}px)`, transition: travel > 0 ? `transform ${travel}ms linear` : "none" } : undefined}
      aria-hidden
    >
      {mood ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="uriel-bubble"
          src={mood}
          alt=""

        />
      ) : null}
      <div className={walking ? "uriel-hop" : "uriel-stand"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="uriel-sprite" src={sprite[pose]} alt="" style={flip ? { transform: "scaleX(-1)" } : undefined} />
      </div>
    </div>
  );
}
