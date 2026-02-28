import type { BlockMediaCapability } from "@/blocks/core/definition";
import {
  processImageArrayField,
  processImageField,
} from "@/blocks/core/lib/server";

const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function isUnsafePathSegment(segment: string): boolean {
  return UNSAFE_PATH_SEGMENTS.has(segment);
}

function isUnsafePath(path: string): boolean {
  return path.split(".").some(isUnsafePathSegment);
}

function getValueByPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  let cursor: unknown = source;

  for (const segment of path.split(".")) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function setValueByPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  if (!path || isUnsafePath(path)) {
    return;
  }

  const segments = path.split(".");
  if (segments.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> = target;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    if (isUnsafePathSegment(segment)) {
      return;
    }
    const existing = cursor[segment];

    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  const finalSegment = segments[segments.length - 1]!;
  if (isUnsafePathSegment(finalSegment)) {
    return;
  }

  cursor[finalSegment] = value;
}

export async function resolveBlockMedia(
  content: unknown,
  mediaCaps: BlockMediaCapability[],
): Promise<Record<string, unknown>> {
  if (!mediaCaps.length) {
    return {};
  }

  const mediaResult: Record<string, unknown> = {};

  await Promise.all(
    mediaCaps.map(async (capability) => {
      const value = getValueByPath(content, capability.path);
      const outputPath = capability.output || capability.path;

      if (capability.kind === "image") {
        if (typeof value !== "string" || !value) {
          return;
        }

        const processed = await processImageField(value);
        if (processed) {
          setValueByPath(mediaResult, outputPath, processed);
        }

        return;
      }

      if (!Array.isArray(value) || value.length === 0) {
        return;
      }

      const urls = value.filter(
        (item): item is string => typeof item === "string" && !!item,
      );

      if (urls.length === 0) {
        return;
      }

      const processed = await processImageArrayField(urls);
      if (processed.length > 0) {
        setValueByPath(mediaResult, outputPath, processed);
      }
    }),
  );

  return mediaResult;
}
