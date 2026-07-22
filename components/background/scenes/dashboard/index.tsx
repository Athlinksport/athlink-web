"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";

import { useScene } from "../../hooks/useScene";
import { Glow } from "../../primitives/Glow";
import { Network } from "../../primitives/Network";
import { Particles } from "../../primitives/Particles";

type Point = readonly [number, number];

const nodes: Point[] = [
  [18, 28],
  [34, 18],
  [51, 27],
  [69, 17],
  [83, 34],
  [24, 58],
  [43, 52],
  [61, 62],
  [78, 69],
  [48, 82],
];

const primaryConnections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [2, 6],
  [5, 6],
  [6, 7],
  [7, 8],
  [7, 9],
] as const;

const emergingConnections = [
  [1, 6],
  [3, 7],
  [4, 8],
  [6, 9],
] as const;

const lateConnections = [
  [0, 6],
  [2, 7],
  [3, 8],
  [5, 9],
] as const;

function Connection({
  from,
  to,
  opacity,
}: {
  from: Point;
  to: Point;
  opacity: number | MotionValue<number>;
}) {
  return (
    <motion.line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke="currentColor"
      strokeWidth="0.16"
      vectorEffect="non-scaling-stroke"
      style={{ opacity }}
    />
  );
}

function EnergyPulse({
  from,
  to,
  opacity,
  delay = 0,
  reducedMotion,
}: {
  from: Point;
  to: Point;
  opacity: number | MotionValue<number>;
  delay?: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.circle
      r="0.7"
      fill="rgb(190 242 100)"
      initial={{ cx: from[0], cy: from[1] }}
      animate={
        reducedMotion
          ? undefined
          : { cx: [from[0], to[0]], cy: [from[1], to[1]] }
      }
      style={{ opacity }}
      transition={{
        duration: 4.8,
        delay,
        repeat: Infinity,
        repeatDelay: 3.2,
        ease: "easeInOut",
      }}
    />
  );
}

/** A living athlete network that becomes broader and more connected with progress. */
export function DashboardScene() {
  const { reducedMotion, scrollProgress } = useScene();
  const networkScale = useTransform(scrollProgress, [0, 0.48, 1], [0.68, 0.9, 1.08]);
  const networkY = useTransform(scrollProgress, [0, 0.5, 1], [8, 0, -10]);
  const primaryOpacity = useTransform(scrollProgress, [0, 0.45, 1], [0.18, 0.38, 0.58]);
  const emergingOpacity = useTransform(
    scrollProgress,
    [0, 0.22, 0.48, 1],
    [0, 0, 0.4, 0.58],
  );
  const lateOpacity = useTransform(
    scrollProgress,
    [0, 0.5, 0.72, 1],
    [0, 0, 0.08, 0.5],
  );
  const pulseOpacity = useTransform(
    scrollProgress,
    [0, 0.2, 0.62, 1],
    [0, 0.16, 0.78, 0.9],
  );
  const particlesY = useTransform(scrollProgress, [0, 1], [0, -10]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-950" aria-hidden="true">
      <Glow className="-left-40 top-[12%] size-[28rem] bg-lime-400/[0.045] blur-[110px]" />
      <Glow className="-right-48 bottom-[8%] size-[32rem] bg-cyan-500/[0.035] blur-[120px]" />

      <Network
        className="inset-x-[3%] top-[5%] h-[90%] bg-none text-lime-200 opacity-100 [background-image:none] sm:inset-x-[8%]"
        style={{
          scale: reducedMotion ? 0.9 : networkScale,
          y: reducedMotion ? 0 : networkY,
          transformOrigin: "50% 48%",
        }}
        animate={
          reducedMotion
            ? undefined
            : { x: [0, 3, -2, 0], rotate: [0, 0.12, -0.08, 0] }
        }
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          className="size-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <g>
            {primaryConnections.map(([from, to]) => (
              <Connection
                key={`${from}-${to}`}
                from={nodes[from]}
                to={nodes[to]}
                opacity={reducedMotion ? 0.34 : primaryOpacity}
              />
            ))}
            {emergingConnections.map(([from, to]) => (
              <Connection
                key={`${from}-${to}`}
                from={nodes[from]}
                to={nodes[to]}
                opacity={reducedMotion ? 0.25 : emergingOpacity}
              />
            ))}
            {lateConnections.map(([from, to]) => (
              <Connection
                key={`late-${from}-${to}`}
                from={nodes[from]}
                to={nodes[to]}
                opacity={reducedMotion ? 0.22 : lateOpacity}
              />
            ))}
          </g>

          <motion.path
            d="M 18 28 L 34 18 L 51 27 L 43 52 L 61 62 L 78 69"
            fill="none"
            stroke="rgb(190 242 100)"
            strokeWidth="0.48"
            strokeLinecap="round"
            strokeDasharray="2 8"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: reducedMotion ? 0.18 : pulseOpacity }}
            animate={reducedMotion ? undefined : { strokeDashoffset: [20, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          />

          {nodes.map(([cx, cy], index) => (
            <motion.g
              key={`${cx}-${cy}`}
              animate={
                reducedMotion
                  ? undefined
                  : {
                      x: [0, index % 2 === 0 ? 0.5 : -0.4, 0],
                      y: [0, index % 3 === 0 ? -0.55 : 0.4, 0],
                    }
              }
              transition={{
                duration: 7 + (index % 4) * 1.3,
                delay: index * -0.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={index === 2 || index === 7 ? 2.1 : 1.65}
                fill="rgb(15 23 42 / 0.9)"
                stroke="rgb(190 242 100 / 0.68)"
                strokeWidth="0.32"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={cx} cy={cy - 0.35} r="0.45" fill="rgb(217 249 157 / 0.78)" />
              <path
                d={`M ${cx - 0.75} ${cy + 0.75} Q ${cx} ${cy + 0.05} ${cx + 0.75} ${cy + 0.75}`}
                fill="none"
                stroke="rgb(217 249 157 / 0.56)"
                strokeWidth="0.25"
                strokeLinecap="round"
              />
            </motion.g>
          ))}

          <g fill="rgb(217 249 157 / 0.7)" fontSize="1.8" fontWeight="600" letterSpacing="0.12">
            <text x="53.8" y="25.5">RUN</text>
            <text x="80.8" y="67.5">TEAM</text>
            <text x="50.8" y="81.5">REC</text>
          </g>

          <EnergyPulse
            from={nodes[0]}
            to={nodes[6]}
            opacity={reducedMotion ? 0 : pulseOpacity}
            reducedMotion={reducedMotion}
          />
          <EnergyPulse
            from={nodes[3]}
            to={nodes[8]}
            opacity={reducedMotion ? 0 : pulseOpacity}
            delay={2.6}
            reducedMotion={reducedMotion}
          />
        </svg>
      </Network>

      <Particles
        count={6}
        className="opacity-45 [&>span]:size-0.5 [&>span]:bg-lime-100/30"
        style={{ y: reducedMotion ? 0 : particlesY }}
      />
    </div>
  );
}
