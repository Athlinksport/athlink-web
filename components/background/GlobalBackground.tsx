"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useScene } from "./hooks/useScene";
import { useBackgroundProfiles } from "./profiles/BackgroundProfilesProvider";
import type { BackgroundProfile } from "./profiles/types";
import { Glow } from "./primitives/Glow";
import { Network } from "./primitives/Network";
import { Particles } from "./primitives/Particles";

type Point = readonly [number, number];
type Depth = "far" | "middle" | "near";

type SocialNode = BackgroundProfile & {
  slot: number;
  depth: Depth;
  position: Point;
  showName: boolean;
  visible: boolean;
};

const positions: Point[] = [
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
  [10, 44],
  [91, 53],
  [32, 75],
  [66, 87],
  [58, 10],
  [87, 18],
];

const depthPattern: readonly Depth[] = [
  "middle",
  "far",
  "near",
  "middle",
  "far",
  "near",
];

const depthStyles = {
  far: {
    avatar:
      "size-[1.875rem] border-slate-300/35 shadow-[0_0_18px_rgb(34_211_238_/_0.08)] blur-[0.35px] sm:size-[2.125rem]",
    opacity: 0.52,
    drift: 0.7,
    parallaxOffset: 3,
    layer: 10,
  },
  middle: {
    avatar:
      "size-[2.0625rem] border-lime-100/45 shadow-[0_0_20px_rgb(163_230_53_/_0.12)] blur-[0.1px] sm:size-[2.3125rem]",
    opacity: 0.72,
    drift: 0.85,
    parallaxOffset: 0,
    layer: 20,
  },
  near: {
    avatar:
      "size-9 border-lime-100/60 shadow-[0_0_0_4px_rgb(163_230_53_/_0.035),0_0_24px_rgb(163_230_53_/_0.16)] sm:size-10",
    opacity: 0.9,
    drift: 1,
    parallaxOffset: -5,
    layer: 30,
  },
} as const;

function getVisibleNodeCount(width: number, height: number) {
  const viewportArea = width * height;

  if (width < 640) {
    return viewportArea >= 360_000 ? 6 : viewportArea >= 260_000 ? 5 : 4;
  }

  if (width < 1024) {
    return viewportArea >= 700_000 ? 8 : viewportArea >= 500_000 ? 7 : 6;
  }

  if (width < 1440) {
    return viewportArea >= 1_200_000 ? 10 : viewportArea >= 900_000 ? 9 : 8;
  }

  if (width < 1920) {
    return viewportArea >= 1_800_000 ? 14 : viewportArea >= 1_400_000 ? 12 : 10;
  }

  return viewportArea >= 3_500_000 ? 16 : viewportArea >= 2_500_000 ? 14 : 12;
}

function useVisibleNodeCount() {
  const [nodeCount, setNodeCount] = useState(6);

  useEffect(() => {
    let frameId: number | null = null;

    const updateNodeCount = () => {
      frameId = null;
      const nextCount = getVisibleNodeCount(window.innerWidth, window.innerHeight);
      setNodeCount((currentCount) =>
        currentCount === nextCount ? currentCount : nextCount,
      );
    };
    const handleResize = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateNodeCount);
      }
    };

    updateNodeCount();
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return nodeCount;
}

function Connection({
  from,
  to,
  opacity,
}: {
  from: Point;
  to: Point;
  opacity: number;
}) {
  return (
    <motion.line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke="currentColor"
      strokeWidth="0.16"
      strokeDasharray="0.7 1.15"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 1.1, ease: "easeInOut" }}
    />
  );
}

function nearbyConnections(nodes: SocialNode[]) {
  const edges = new Map<string, readonly [number, number, number]>();

  nodes.forEach((node, index) => {
    nodes
      .map((candidate, candidateIndex) => ({
        candidateIndex,
        distance: Math.hypot(
          candidate.position[0] - node.position[0],
          candidate.position[1] - node.position[1],
        ),
      }))
      .filter(
        ({ candidateIndex, distance }) =>
          candidateIndex !== index && distance < 31,
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .forEach(({ candidateIndex, distance }) => {
        const from = Math.min(index, candidateIndex);
        const to = Math.max(index, candidateIndex);
        edges.set(`${from}-${to}`, [from, to, distance]);
      });
  });

  return [...edges.values()];
}

function makeNode(
  slot: number,
  profile: BackgroundProfile | undefined,
  position: Point,
): SocialNode {
  return {
    slot,
    id: profile?.id ?? `anonymous-${slot}`,
    firstName: profile?.firstName ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    allowPublicBackground: profile?.allowPublicBackground === true,
    depth: depthPattern[slot % depthPattern.length],
    position,
    showName: slot % 3 !== 1,
    visible: true,
  };
}

function entryPosition(slot: number, direction: 1 | -1): Point {
  const xPattern = [16, 34, 53, 72, 87, 25, 64, 42];
  const x = xPattern[slot % xPattern.length] + ((slot * 7) % 5) - 2;
  const y = direction > 0 ? 88 + (slot % 3) * 2 : 8 + (slot % 3) * 2;

  return [x, y];
}

function useRecycledNodes(
  profiles: readonly BackgroundProfile[],
  visibleNodeCount: number,
  reducedMotion: boolean,
) {
  const [nodes, setNodes] = useState<SocialNode[]>(() =>
    positions.map((position, slot) =>
      makeNode(
        slot,
        profiles[slot % Math.max(profiles.length, 1)],
        position,
      ),
    ),
  );
  const nodesRef = useRef(nodes);
  const visibleCountRef = useRef(visibleNodeCount);
  const profileCursor = useRef(0);
  const recycleCursor = useRef(0);
  const accumulatedScroll = useRef(0);
  const lastScrollY = useRef(0);
  const recycling = useRef(false);
  const timeouts = useRef<number[]>([]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    visibleCountRef.current = visibleNodeCount;
  }, [visibleNodeCount]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    lastScrollY.current = window.scrollY;

    const recycle = (direction: 1 | -1) => {
      if (recycling.current || nodesRef.current.length < 2) {
        return;
      }

      recycling.current = true;
      const slot = recycleCursor.current % visibleCountRef.current;
      recycleCursor.current += 1;

      setNodes((current) =>
        current.map((node) =>
          node.slot === slot ? { ...node, visible: false } : node,
        ),
      );

      const swapTimeout = window.setTimeout(() => {
        const profile =
          profiles[profileCursor.current % Math.max(profiles.length, 1)];
        profileCursor.current += 1;

        setNodes((current) =>
          current.map((node) =>
            node.slot === slot
              ? {
                  ...makeNode(slot, profile, entryPosition(slot, direction)),
                  visible: false,
                }
              : node,
          ),
        );

        const revealTimeout = window.setTimeout(() => {
          setNodes((current) =>
            current.map((node) =>
              node.slot === slot ? { ...node, visible: true } : node,
            ),
          );
          recycling.current = false;
        }, 80);
        timeouts.current.push(revealTimeout);
      }, 900);
      timeouts.current.push(swapTimeout);
    };

    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollY.current;
      lastScrollY.current = nextScrollY;
      accumulatedScroll.current += delta;

      if (Math.abs(accumulatedScroll.current) >= 180) {
        const direction = accumulatedScroll.current > 0 ? 1 : -1;
        accumulatedScroll.current -= direction * 180;
        recycle(direction);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      timeouts.current.forEach(window.clearTimeout);
      timeouts.current = [];
      recycling.current = false;
    };
  }, [profiles, reducedMotion]);

  return nodes.slice(0, visibleNodeCount);
}

function initials(name: string | null) {
  return name?.trim().charAt(0).toUpperCase() || "•";
}

function ProfileNode({
  node,
  index,
  reducedMotion,
  scrollProgress,
}: {
  node: SocialNode;
  index: number;
  reducedMotion: boolean;
  scrollProgress: MotionValue<number>;
}) {
  const publicName = node.allowPublicBackground ? node.firstName : null;
  const depthStyle = depthStyles[node.depth];
  const duration = 18 + (index % 4) * 2.6;
  const driftX = (index % 2 === 0 ? 8 : -7) * depthStyle.drift;
  const driftY = (index % 3 === 0 ? -9 : 7) * depthStyle.drift;
  const parallaxY = useTransform(
    scrollProgress,
    [0, 1],
    [0, depthStyle.parallaxOffset],
  );

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${node.position[0]}%`,
        top: `${node.position[1]}%`,
        y: reducedMotion ? 0 : parallaxY,
        zIndex: depthStyle.layer,
      }}
    >
      <motion.div
        className="flex items-center gap-1.5 will-change-transform"
        initial={{
          opacity: node.visible ? depthStyle.opacity : 0,
          x: "-50%",
          y: "-50%",
        }}
        animate={
          reducedMotion
            ? undefined
            : {
                opacity: node.visible ? depthStyle.opacity : 0,
                translateX: [0, driftX, driftX / 3, 0],
                translateY: [0, driftY, -driftY / 3, 0],
              }
        }
        transition={{
          duration,
          delay: -index * 2.1,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.38, 0.72, 1],
          opacity: { duration: 0.9, ease: "easeInOut" },
        }}
      >
        <span className="relative grid shrink-0 place-items-center">
          {node.depth === "near" ? (
            <motion.span
              className="absolute inset-[-0.3rem] rounded-full border border-lime-300/20"
              animate={
                reducedMotion
                  ? undefined
                  : { opacity: [0.15, 0.42, 0.15] }
              }
              transition={{
                duration: 5.5 + (index % 3),
                delay: -index,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ) : null}
          <span
            className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border bg-slate-900 text-[9px] font-semibold text-lime-100/80 ${depthStyle.avatar}`}
          >
            {node.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny third-party development fixtures; real profiles provide their own URL.
              <img className="size-full object-cover" src={node.avatarUrl} alt="" />
            ) : (
              <span>{node.allowPublicBackground ? initials(node.firstName) : "•"}</span>
            )}
          </span>
        </span>
        {node.showName && publicName ? (
          <span className="rounded-full border border-white/[0.1] bg-slate-950/60 px-2 py-0.5 text-[10px] font-medium text-slate-100/80 shadow-[0_5px_18px_rgb(2_6_23_/_0.22)] [text-shadow:0_1px_5px_rgb(2_6_23_/_0.65)] backdrop-blur-sm sm:text-[11px]">
            {publicName}
          </span>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

/**
 * The application's persistent living social network background.
 * Names are rendered only when `allowPublicBackground` is explicitly true.
 */
export function GlobalBackground() {
  const { reducedMotion, scrollProgress } = useScene();
  const profiles = useBackgroundProfiles();
  const visibleNodeCount = useVisibleNodeCount();
  const farLayerY = useTransform(scrollProgress, [0, 1], [0, -2]);
  const middleLayerY = useTransform(scrollProgress, [0, 1], [0, -5]);
  const nearLayerY = useTransform(scrollProgress, [0, 1], [0, -10]);
  const nodes = useRecycledNodes(profiles, visibleNodeCount, reducedMotion);
  const connections = useMemo(() => nearbyConnections(nodes), [nodes]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-950"
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 opacity-[0.95] will-change-transform"
        style={{ y: reducedMotion ? 0 : farLayerY }}
      >
        <Glow className="-left-40 top-[12%] size-[28rem] bg-lime-400/[0.045] blur-[110px]" />
        <Glow className="-right-48 bottom-[8%] size-[32rem] bg-cyan-500/[0.035] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgb(30_41_59_/_0.16),transparent_48%),linear-gradient(to_bottom,rgb(15_23_42_/_0.08),rgb(2_6_23_/_0.28))]" />
      </motion.div>

      <Network
        className="inset-x-[3%] top-[5%] h-[90%] bg-none text-lime-200 opacity-[0.95] will-change-transform [background-image:none] sm:inset-x-[8%]"
        style={{
          y: reducedMotion ? 0 : middleLayerY,
        }}
        animate={reducedMotion ? undefined : { x: [0, 2, -1.5, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg className="size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {connections.map(([from, to, distance]) => (
            <Connection
              key={`${nodes[from].slot}-${nodes[to].slot}`}
              from={nodes[from].position}
              to={nodes[to].position}
              opacity={
                nodes[from].visible && nodes[to].visible
                  ? distance < 22
                    ? 0.2
                    : 0.13
                  : 0
              }
            />
          ))}
        </svg>

        {nodes.map((node, index) => (
          <ProfileNode
            key={node.slot}
            node={node}
            index={index}
            reducedMotion={reducedMotion}
            scrollProgress={scrollProgress}
          />
        ))}
      </Network>

      <Particles
        count={5}
        className="opacity-[0.38] will-change-transform [&>span]:size-0.5 [&>span]:bg-lime-100/30"
        style={{ y: reducedMotion ? 0 : nearLayerY }}
      />
    </div>
  );
}
