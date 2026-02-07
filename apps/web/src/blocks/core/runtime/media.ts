import type { BlockMediaCapability } from "@/blocks/core/definition";
import {
  processImageArrayField,
  processImageField,
} from "@/blocks/core/lib/server";

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
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const existing = cursor[segment];

    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]!] = value;
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
