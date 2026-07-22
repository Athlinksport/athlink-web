"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";

import { useScene } from "../../hooks/useScene";
import { Glow } from "../../primitives/Glow";
import { GradientMesh } from "../../primitives/GradientMesh";
import { Network } from "../../primitives/Network";
import { Particles } from "../../primitives/Particles";

type Point = readonly [number, number];
type ConnectionPair = readonly [number, number];

const nodes: readonly Point[] = [
  [18, 25],
  [28, 18],
  [33, 31],
  [47, 44],
  [56, 34],
  [62, 48],
  [51, 57],
  [76, 24],
  [84, 34],
  [75, 42],
  [21, 67],
  [31, 77],
  [42, 68],
  [67, 75],
  [79, 69],
  [7, 45],
  [92, 54],
  [91, 82],
] as const;

const initialConnections: readonly ConnectionPair[] = [
  [0, 1],
  [0, 2],
  [3, 4],
  [3, 6],
] as const;

const middleConnections: readonly ConnectionPair[] = [
  [4, 5],
  [5, 6],
  [7, 8],
  [8, 9],
  [2, 3],
] as const;

const lateConnections: readonly ConnectionPair[] = [
  [10, 11],
  [11, 12],
  [6, 12],
  [5, 13],
  [13, 14],
  [9, 14],
  [0, 15],
  [9, 16],
  [14, 17],
  [13, 17],
] as const;

function Connection({
  pair: [fromIndex, toIndex],
  opacity,
}: {
  pair: ConnectionPair;
  opacity: number | MotionValue<number>;
}) {
  const from = nodes[fromIndex];
  const to = nodes[toIndex];

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

function AthleteNode({
  point: [cx, cy],
  opacity,
  featured = false,
}: {
  point: Point;
  opacity: number | MotionValue<number>;
  featured?: boolean;
}) {
  return (
    <motion.g style={{ opacity }}>
      {featured && (
        <circle
          cx={cx}
          cy={cy}
          r="2.6"
          fill="rgb(190 242 100 / 0.035)"
          stroke="rgb(190 242 100 / 0.16)"
          strokeWidth="0.16"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={featured ? 1.35 : 1.05}
        fill="rgb(15 23 42 / 0.94)"
        stroke="rgb(190 242 100 / 0.62)"
        strokeWidth="0.28"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={cx}
        cy={cy}
        r={featured ? 0.38 : 0.3}
        fill="rgb(217 249 157 / 0.82)"
      />
    </motion.g>
  );
}

/** Athlete clusters emerge and connect as discovery broadens through the page. */
export function DiscoverScene() {
  const { reducedMotion, scrollProgress } = useScene();
  const networkScale = useTransform(scrollProgress, [0, 0.48, 1], [0.8, 0.96, 1.09]);
  const networkY = useTransform(scrollProgress, [0, 0.5, 1], [8, 0, -11]);
  const initialConnectionOpacity = useTransform(scrollProgress, [0, 0.45, 1], [0.18, 0.34, 0.48]);
  const middleNodeOpacity = useTransform(scrollProgress, [0.12, 0.28, 0.38], [0, 0.15, 0.82]);
  const lateNodeOpacity = useTransform(scrollProgress, [0.48, 0.64, 0.74], [0, 0.12, 0.8]);
  const middleConnectionOpacity = useTransform(scrollProgress, [0.18, 0.34, 0.52], [0, 0.12, 0.46]);
  const lateConnectionOpacity = useTransform(scrollProgress, [0.52, 0.7, 0.9], [0, 0.1, 0.42]);
  const pulseOpacity = useTransform(scrollProgress, [0.18, 0.34, 1], [0, 0.78, 0.88]);
  const particleY = useTransform(scrollProgress, [0, 1], [5, -12]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-950"
    >
      <GradientMesh
        className="opacity-55 [background-image:radial-gradient(circle_at_18%_20%,rgb(190_242_100/0.035),transparent_32%),radial-gradient(circle_at_78%_58%,rgb(34_211_238/0.025),transparent_38%)]"
      />
      <Glow className="-right-52 top-[28%] size-[30rem] bg-lime-300/[0.035] blur-[120px]" />

      <Network
        className="inset-x-[-10%] top-[3%] h-[94%] bg-none text-lime-100 opacity-100 [background-image:none] sm:inset-x-[2%] lg:inset-x-[8%]"
        style={{
          scale: reducedMotion ? 0.96 : networkScale,
          y: reducedMotion ? 0 : networkY,
          transformOrigin: "50% 48%",
        }}
      >
        <svg
          className="size-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          {initialConnections.map((pair) => (
            <Connection
              key={`${pair[0]}-${pair[1]}`}
              pair={pair}
              opacity={reducedMotion ? 0.3 : initialConnectionOpacity}
            />
          ))}
          {middleConnections.map((pair) => (
            <Connection
              key={`${pair[0]}-${pair[1]}`}
              pair={pair}
              opacity={reducedMotion ? 0.25 : middleConnectionOpacity}
            />
          ))}
          {lateConnections.map((pair) => (
            <Connection
              key={`${pair[0]}-${pair[1]}`}
              pair={pair}
              opacity={reducedMotion ? 0.22 : lateConnectionOpacity}
            />
          ))}

          <motion.path
            d="M 18 25 L 33 31 L 47 44 L 62 48 L 75 42 L 84 34"
            fill="none"
            stroke="rgb(217 249 157)"
            strokeWidth="0.46"
            strokeDasharray="1.8 7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: reducedMotion ? 0.16 : pulseOpacity }}
            animate={reducedMotion ? undefined : { strokeDashoffset: [18, 0] }}
            transition={{ duration: 2.9, repeat: Infinity, ease: "linear" }}
          />

          <g>
            {[0, 1, 2].map((index) => (
              <AthleteNode
                key={index}
                point={nodes[index]}
                opacity={0.82}
                featured={index === 0}
              />
            ))}
          </g>

          {[3, 4, 5, 6].map((index) => (
            <AthleteNode
              key={index}
              point={nodes[index]}
              opacity={index < 5 || reducedMotion ? 0.78 : middleNodeOpacity}
              featured={index === 3}
            />
          ))}

          <g>
            {[7, 8, 9].map((index) => (
              <AthleteNode
                key={index}
                point={nodes[index]}
                opacity={reducedMotion ? 0.7 : middleNodeOpacity}
                featured={index === 8}
              />
            ))}
          </g>

          <g>
            {[10, 11, 12, 13, 14, 15, 16, 17].map((index) => (
              <AthleteNode
                key={index}
                point={nodes[index]}
                opacity={reducedMotion ? 0.66 : lateNodeOpacity}
                featured={index === 13}
              />
            ))}
          </g>

          <motion.circle
            r="0.48"
            fill="rgb(217 249 157)"
            initial={{ cx: nodes[2][0], cy: nodes[2][1] }}
            animate={
              reducedMotion
                ? undefined
                : {
                    cx: [nodes[2][0], nodes[3][0]],
                    cy: [nodes[2][1], nodes[3][1]],
                  }
            }
            style={{ opacity: reducedMotion ? 0 : pulseOpacity }}
            transition={{
              duration: 4.6,
              repeat: Infinity,
              repeatDelay: 5.4,
              ease: "easeInOut",
            }}
          />
        </svg>
      </Network>

      <Particles
        count={5}
        className="opacity-30 [&>span]:size-0.5 [&>span]:bg-lime-100/25"
        style={{ y: reducedMotion ? 0 : particleY }}
      />
    </div>
  );
}
