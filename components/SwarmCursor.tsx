"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cursor swarm: ~40 small arrow cursors that flock around the mouse pointer.
 *
 *  - Boids rules (cohesion, alignment, separation) plus attraction to the pointer
 *    with a per-cursor orbit radius, so they circle it in a loose cluster
 *    instead of piling on top of it.
 *  - Scan-in on load: cursors start scattered, sweep toward the pointer over ~1s
 *    while a faint scan line passes down the page once.
 *  - Rebuild on scroll: cursors burst apart briefly, then re-form around the pointer.
 *  - Drifts slowly when the mouse is idle.
 *  - Off on touch devices and with prefers-reduced-motion; pauses when the tab is hidden.
 *
 * ── One flag to turn it off ──────────────────────────────────────────────────
 * Set SWARM_ENABLED to false and the component renders nothing and runs no code.
 */
export const SWARM_ENABLED = true;

const COUNT = 40; // performance cap
const CURSOR_PX = 14; // arrow length, ~12–16px
const ACCENT_RGB = "79, 140, 255"; // site accent (#4f8cff, `accent` in tailwind.config.ts)
const OUTLINE_RGB = "214, 226, 244"; // subtle light outline (navy-100 tint)

// Boids. Speeds are px per frame at 60fps; every step is scaled by real elapsed time.
const PERCEPTION = 80; // neighbour radius for cohesion / alignment
const SEPARATION = 24; // personal-space radius
const MAX_SPEED = 4.2;
const MAX_FORCE = 0.14;
const W_COHESION = 0.35;
const W_ALIGNMENT = 0.8;
const W_SEPARATION = 1.6;

// Pointer orbit: each cursor has its own preferred radius around the pointer.
const ORBIT_MIN = 55;
const ORBIT_MAX = 135;
const ARRIVE_GAIN = 0.06; // approach speed per px of distance from the orbit radius (eases in, no overshoot)
const ORBIT_SPEED = 1.6; // sideways speed so the cluster circles the pointer

// Timeline (ms)
const INTRO_MS = 1100; // scatter -> sweep in; also the length of the scan line pass
const SCATTER_MS = 300; // scroll burst duration
const SCATTER_COOLDOWN_MS = 1400; // minimum gap between scroll bursts
const SCATTER_SPEED = 18; // speed cap while scattering
const REFORM_BOOST = 0.7; // how hard they snap back after a scatter (1 = intro strength)

type Particle = { x: number; y: number; vx: number; vy: number; angle: number; orbit: number };

function limit(x: number, y: number, max: number): [number, number] {
  const m = Math.hypot(x, y);
  return m > max ? [(x / m) * max, (y / m) * max] : [x, y];
}

/** Steering force toward a desired direction at full speed, clamped to maxForce. */
function steer(
  dx: number, dy: number, vx: number, vy: number, maxSpeed: number, maxForce: number,
): [number, number] {
  const m = Math.hypot(dx, dy);
  if (m === 0) return [0, 0];
  return limit((dx / m) * maxSpeed - vx, (dy / m) * maxSpeed - vy, maxForce);
}

/**
 * The classic pointer arrow, re-centred and rotated so its tip faces +x.
 * Drawing it with a rotation of the heading angle makes the tip lead the motion.
 */
function buildArrow(size: number): Path2D {
  const classic: [number, number][] = [
    [0, 0], [0, 14], [3.6, 10.7], [6.3, 16.6], [8.5, 15.6], [5.9, 9.9], [10.6, 9.9],
  ];
  const cx = classic.reduce((s, [x]) => s + x, 0) / classic.length;
  const cy = classic.reduce((s, [, y]) => s + y, 0) / classic.length;
  const tipAngle = Math.atan2(-cy, -cx); // direction from the centre to the tip
  const cos = Math.cos(-tipAngle);
  const sin = Math.sin(-tipAngle);
  const scale = size / 16.6;
  const path = new Path2D();
  classic.forEach(([x, y], i) => {
    const dx = x - cx;
    const dy = y - cy;
    const px = (dx * cos - dy * sin) * scale;
    const py = (dx * sin + dy * cos) * scale;
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  });
  path.closePath();
  return path;
}

export default function SwarmCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  // Decide whether the effect should run: not on touch devices, not when the
  // user prefers reduced motion. Re-evaluates if either preference changes.
  useEffect(() => {
    if (!SWARM_ENABLED) return;
    const touch = window.matchMedia("(hover: none), (pointer: coarse)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setActive(!touch.matches && !reduced.matches);
    update();
    touch.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      touch.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const arrow = buildArrow(CURSOR_PX);

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();

    // Scan-in start: scattered across the whole screen with a little random drift.
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      angle: Math.random() * Math.PI * 2,
      orbit: ORBIT_MIN + Math.random() * (ORBIT_MAX - ORBIT_MIN),
    }));

    // All timers run on `clock`, which only advances while frames are running,
    // so time spent in a hidden tab never gets "used up".
    let clock = 0;
    let boost = 1; // 1 = full-strength sweep (intro); decays to 0
    let scatter = 0; // ms of scroll burst remaining
    let lastScatterAt = -Infinity;
    let idle = 0; // 0 = mouse moving, 1 = idle (eased)
    let lastMove = 0;
    let pointer: { x: number; y: number } | null = null;

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      lastMove = clock;
    };
    const onLeave = () => {
      pointer = null;
    };

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const moved = Math.abs(y - lastY);
      lastY = y;
      if (moved < 6 || scatter > 0 || clock - lastScatterAt < SCATTER_COOLDOWN_MS) return;
      lastScatterAt = clock;
      scatter = SCATTER_MS;
      const cx = pointer?.x ?? width / 2;
      const cy = pointer?.y ?? height / 2;
      for (const p of particles) {
        const away = Math.atan2(p.y - cy, p.x - cx);
        const ang = away + (Math.random() - 0.5) * 2.2; // mostly outward, with spread
        const speed = 9 + Math.random() * 9;
        p.vx += Math.cos(ang) * speed;
        p.vy += Math.sin(ang) * speed;
      }
    };

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const ms = Math.min(last ? now - last : 16.667, 50); // clamp after stalls
      last = now;
      const dt = ms / 16.667;
      clock += ms;

      boost = Math.max(0, boost - ms / INTRO_MS);
      if (scatter > 0) {
        scatter -= ms;
        if (scatter <= 0) {
          scatter = 0;
          boost = Math.max(boost, REFORM_BOOST); // re-form around the pointer
        }
      }
      const scattering = scatter > 0;

      // Idle: ease toward 1 once the mouse has been still for a moment.
      const idleGoal = pointer ? Math.min(Math.max((clock - lastMove - 900) / 1200, 0), 1) : 1;
      idle += (idleGoal - idle) * Math.min(1, 0.04 * dt);

      // Target: the pointer (with a slow wobble when idle) or, with no pointer, a wandering point.
      const tx = pointer
        ? pointer.x + Math.cos(clock * 0.0007) * 42 * idle
        : width / 2 + Math.cos(clock * 0.0003) * width * 0.28;
      const ty = pointer
        ? pointer.y + Math.sin(clock * 0.0009) * 32 * idle
        : height / 2 + Math.sin(clock * 0.00041) * height * 0.22;

      // Flocking always runs at normal strength; only the pull toward the pointer is
      // boosted (intro / re-form), so the sweep isn't fought by the flock's momentum.
      const flockSpeed = MAX_SPEED * (1 - 0.4 * idle);
      const maxSpeed = flockSpeed * (1 + 4 * boost);
      const maxForce = MAX_FORCE * (1 + 6 * boost);
      const flock = scattering ? 0.2 : 1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;
        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;
          const o = particles[j];
          const dx = o.x - p.x;
          const dy = o.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > PERCEPTION * PERCEPTION) continue;
          n++;
          cx += o.x; cy += o.y;
          ax += o.vx; ay += o.vy;
          if (d2 < SEPARATION * SEPARATION && d2 > 0.0001) {
            sx -= dx / d2; // closer neighbours push harder
            sy -= dy / d2;
          }
        }

        let fx = 0, fy = 0;
        if (n > 0) {
          const [cohX, cohY] = steer(cx / n - p.x, cy / n - p.y, p.vx, p.vy, flockSpeed, MAX_FORCE);
          const [aliX, aliY] = steer(ax / n, ay / n, p.vx, p.vy, flockSpeed, MAX_FORCE);
          fx += (cohX * W_COHESION + aliX * W_ALIGNMENT) * flock;
          fy += (cohY * W_COHESION + aliY * W_ALIGNMENT) * flock;
        }
        if (sx !== 0 || sy !== 0) {
          const [sepX, sepY] = steer(sx, sy, p.vx, p.vy, flockSpeed, MAX_FORCE);
          fx += sepX * W_SEPARATION;
          fy += sepY * W_SEPARATION;
        }

        if (!scattering) {
          // Attraction with an orbit radius. The desired velocity points toward the
          // pointer when outside this cursor's orbit radius and away when inside,
          // easing to zero at the radius (so it brakes instead of overshooting), plus a
          // sideways component so the cursor circles the pointer.
          const dx = tx - p.x;
          const dy = ty - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const ux = dx / d;
          const uy = dy / d;
          const err = d - p.orbit;
          const radialSpeed = Math.max(-maxSpeed * 0.6, Math.min(err * ARRIVE_GAIN, maxSpeed));
          const near = 1 / (1 + Math.pow(Math.max(0, err) / 120, 2)); // circling fades in near the orbit
          const sideSpeed = ORBIT_SPEED * (1 - 0.6 * idle) * near;
          const [sfx, sfy] = limit(
            ux * radialSpeed - uy * sideSpeed - p.vx,
            uy * radialSpeed + ux * sideSpeed - p.vy,
            maxForce * 1.6,
          );
          fx += sfx;
          fy += sfy;
        }

        p.vx += fx * dt;
        p.vy += fy * dt;
        const drag = Math.pow(scattering ? 0.975 : 0.992, dt);
        p.vx *= drag;
        p.vy *= drag;
        [p.vx, p.vy] = limit(p.vx, p.vy, scattering ? SCATTER_SPEED : maxSpeed);
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Soft walls
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.8; }
        else if (p.x > width) { p.x = width; p.vx = -Math.abs(p.vx) * 0.8; }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) * 0.8; }
        else if (p.y > height) { p.y = height; p.vy = -Math.abs(p.vy) * 0.8; }

        // Face the direction of travel (smoothed along the shortest turn).
        if (Math.hypot(p.vx, p.vy) > 0.15) {
          const diff = Math.atan2(p.vy, p.vx) - p.angle;
          p.angle += Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1, 0.22 * dt);
        }
      }

      // ── Draw ──────────────────────────────────────────────────────────────
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Scan line: passes down the page once during the intro.
      if (clock < INTRO_MS) {
        const t = clock / INTRO_MS;
        const y = t * t * (3 - 2 * t) * height; // smoothstep
        const fade = Math.pow(Math.sin(Math.PI * t), 0.6);
        const glow = ctx.createLinearGradient(0, y - 90, 0, y);
        glow.addColorStop(0, `rgba(${ACCENT_RGB}, 0)`);
        glow.addColorStop(1, `rgba(${ACCENT_RGB}, ${0.07 * fade})`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, y - 90, width, 90);
        const line = ctx.createLinearGradient(0, 0, width, 0);
        line.addColorStop(0, `rgba(${ACCENT_RGB}, 0)`);
        line.addColorStop(0.5, `rgba(${ACCENT_RGB}, ${0.4 * fade})`);
        line.addColorStop(1, `rgba(${ACCENT_RGB}, 0)`);
        ctx.fillStyle = line;
        ctx.fillRect(0, y - 0.75, width, 1.5);
      }

      // Cursors: accent fill with a subtle light outline, rotated to their heading.
      ctx.globalAlpha = Math.min(1, clock / 250); // fade in so nothing pops on load
      ctx.fillStyle = `rgba(${ACCENT_RGB}, 0.85)`;
      ctx.strokeStyle = `rgba(${OUTLINE_RGB}, 0.5)`;
      ctx.lineWidth = 0.9;
      ctx.lineJoin = "round";
      for (const p of particles) {
        const c = Math.cos(p.angle);
        const s = Math.sin(p.angle);
        ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * p.x, dpr * p.y);
        ctx.fill(arrow);
        ctx.stroke(arrow);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();

    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  if (!SWARM_ENABLED || !active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 h-full w-full select-none"
    />
  );
}
