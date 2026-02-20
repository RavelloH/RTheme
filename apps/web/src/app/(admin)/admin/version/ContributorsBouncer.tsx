/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef } from "react";

import type { GithubContributor } from "@/lib/server/github-contributors";

type BubbleMeta = {
  id: number;
  radius: number;
  label: string;
  contributor: GithubContributor;
};

type BubbleState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

const MAX_VISIBLE_CONTRIBUTORS = 24;
const AVATAR_RADIUS = 20;
const MIN_SPEED = 28;
const MAX_SPEED = 92;
const RESTITUTION = 0.96;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function seedRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function buildBubbleMeta(contributors: GithubContributor[]): BubbleMeta[] {
  const visible = contributors.slice(0, MAX_VISIBLE_CONTRIBUTORS);

  return visible.map((contributor) => {
    return {
      id: contributor.id,
      radius: AVATAR_RADIUS,
      label: `${contributor.login} · ${formatNumber(contributor.contributions)} 次贡献`,
      contributor,
    };
  });
}

function ensureSpeed(state: BubbleState): void {
  const speed = Math.hypot(state.vx, state.vy);
  if (speed < 1e-6) {
    state.vx = MIN_SPEED;
    state.vy = MIN_SPEED;
    return;
  }

  if (speed < MIN_SPEED) {
    const ratio = MIN_SPEED / speed;
    state.vx *= ratio;
    state.vy *= ratio;
    return;
  }

  if (speed > MAX_SPEED) {
    const ratio = MAX_SPEED / speed;
    state.vx *= ratio;
    state.vy *= ratio;
  }
}

export default function ContributorsBouncer({
  contributors,
  errorMessage,
}: {
  contributors: GithubContributor[];
  errorMessage?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const bubbleMeta = useMemo(
    () => buildBubbleMeta(contributors),
    [contributors],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || bubbleMeta.length === 0) return;

    const random = seedRandom(
      bubbleMeta.reduce((sum, item) => sum + item.id, 0) || 1,
    );

    const states: BubbleState[] = bubbleMeta.map((item) => {
      const angle = random() * Math.PI * 2;
      const speed = MIN_SPEED + random() * (MAX_SPEED - MIN_SPEED);
      return {
        x: item.radius,
        y: item.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: item.radius,
      };
    });

    const initLayout = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);

      for (let i = 0; i < states.length; i += 1) {
        const current = states[i]!;
        const radius = current.radius;
        const minX = radius;
        const maxX = Math.max(radius, width - radius);
        const minY = radius;
        const maxY = Math.max(radius, height - radius);

        let bestX = clamp(minX + random() * (maxX - minX), minX, maxX);
        let bestY = clamp(minY + random() * (maxY - minY), minY, maxY);
        let placed = false;

        for (let attempt = 0; attempt < 120; attempt += 1) {
          const candidateX = clamp(minX + random() * (maxX - minX), minX, maxX);
          const candidateY = clamp(minY + random() * (maxY - minY), minY, maxY);
          let overlap = false;

          for (let j = 0; j < i; j += 1) {
            const target = states[j]!;
            const minDist = radius + target.radius + 2;
            const dx = candidateX - target.x;
            const dy = candidateY - target.y;
            if (dx * dx + dy * dy < minDist * minDist) {
              overlap = true;
              break;
            }
          }

          if (!overlap) {
            bestX = candidateX;
            bestY = candidateY;
            placed = true;
            break;
          }
        }

        if (!placed) {
          bestX = clamp(bestX, minX, maxX);
          bestY = clamp(bestY, minY, maxY);
        }

        current.x = bestX;
        current.y = bestY;
      }
    };

    const applyTransforms = () => {
      for (let i = 0; i < states.length; i += 1) {
        const node = bubbleRefs.current[i];
        if (!node) continue;

        const current = states[i]!;
        node.style.transform = `translate3d(${current.x - current.radius}px, ${current.y - current.radius}px, 0)`;
      }
    };

    initLayout();
    applyTransforms();

    let animationFrameId = 0;
    let lastTimestamp = 0;

    const tick = (timestamp: number) => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      const deltaTime =
        lastTimestamp > 0
          ? Math.min((timestamp - lastTimestamp) / 1000, 0.03)
          : 0.016;
      lastTimestamp = timestamp;

      for (const state of states) {
        state.x += state.vx * deltaTime;
        state.y += state.vy * deltaTime;

        if (state.x - state.radius <= 0) {
          state.x = state.radius;
          state.vx = Math.abs(state.vx) * RESTITUTION;
        } else if (state.x + state.radius >= width) {
          state.x = width - state.radius;
          state.vx = -Math.abs(state.vx) * RESTITUTION;
        }

        if (state.y - state.radius <= 0) {
          state.y = state.radius;
          state.vy = Math.abs(state.vy) * RESTITUTION;
        } else if (state.y + state.radius >= height) {
          state.y = height - state.radius;
          state.vy = -Math.abs(state.vy) * RESTITUTION;
        }
      }

      for (let i = 0; i < states.length; i += 1) {
        for (let j = i + 1; j < states.length; j += 1) {
          const left = states[i]!;
          const right = states[j]!;

          let dx = right.x - left.x;
          let dy = right.y - left.y;
          let distance = Math.hypot(dx, dy);
          const minDistance = left.radius + right.radius;

          if (distance <= 0.0001) {
            dx = 0.01;
            dy = 0.01;
            distance = Math.hypot(dx, dy);
          }

          if (distance < minDistance) {
            const nx = dx / distance;
            const ny = dy / distance;
            const overlap = minDistance - distance;
            const offset = overlap * 0.5 + 0.01;

            left.x -= nx * offset;
            left.y -= ny * offset;
            right.x += nx * offset;
            right.y += ny * offset;

            const rvx = right.vx - left.vx;
            const rvy = right.vy - left.vy;
            const speedOnNormal = rvx * nx + rvy * ny;

            if (speedOnNormal < 0) {
              const impulse = (-(1 + RESTITUTION) * speedOnNormal) / 2;
              left.vx -= impulse * nx;
              left.vy -= impulse * ny;
              right.vx += impulse * nx;
              right.vy += impulse * ny;
            }

            ensureSpeed(left);
            ensureSpeed(right);
          }
        }
      }

      applyTransforms();
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(() => {
      initLayout();
      applyTransforms();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [bubbleMeta]);

  if (errorMessage) {
    return (
      <div className="flex h-full items-center text-sm text-warning">
        贡献者数据获取失败：{errorMessage}
      </div>
    );
  }

  if (bubbleMeta.length === 0) {
    return (
      <div className="flex h-full items-center text-sm text-muted-foreground">
        暂无贡献者数据
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {bubbleMeta.map((item, index) => {
        const diameter = item.radius * 2;
        return (
          <a
            key={item.id}
            ref={(node) => {
              bubbleRefs.current[index] = node;
            }}
            href={item.contributor.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="group absolute left-0 top-0 block cursor-pointer will-change-transform"
            title={item.label}
            style={{
              width: `${diameter}px`,
              height: `${diameter}px`,
            }}
            aria-label={item.label}
          >
            <img
              src={item.contributor.avatarUrl}
              alt={item.contributor.login}
              className="h-full w-full rounded-full border border-border object-cover shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:border-primary"
              draggable={false}
              loading="lazy"
            />
            <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[120%] whitespace-nowrap rounded border border-border bg-background/95 px-2 py-1 text-xs opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100">
              @{item.contributor.login}
            </span>
          </a>
        );
      })}
    </div>
  );
}
