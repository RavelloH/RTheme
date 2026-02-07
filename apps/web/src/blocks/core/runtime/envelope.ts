import type {
  BlockRuntimeContext,
  BlockRuntimeEnvelope,
} from "@/blocks/core/definition";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function mergeObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value)) {
      const existing = target[key];
      const base = isPlainObject(existing) ? existing : {};
      target[key] = mergeObjects({ ...base }, value);
      continue;
    }

    target[key] = value;
  }

  return target;
}

export function createEmptyRuntimeEnvelope<TBusiness = Record<string, never>>(
  context: BlockRuntimeContext,
): BlockRuntimeEnvelope<TBusiness> {
  return {
    context,
    placeholders: {},
    media: {},
    business: {} as TBusiness,
    meta: {
      status: "ok",
    },
  };
}

export function getBlockRuntimeData<TData = Record<string, unknown>>(
  runtime: BlockRuntimeEnvelope<unknown> | undefined,
): TData {
  if (!runtime) {
    return {} as TData;
  }

  const merged: Record<string, unknown> = {};

  mergeObjects(merged, runtime.context as Record<string, unknown>);
  mergeObjects(merged, runtime.placeholders);
  mergeObjects(merged, runtime.media);

  if (isPlainObject(runtime.business)) {
    mergeObjects(merged, runtime.business);
  }

  return merged as TData;
}

export function normalizeRuntimeContext(
  context: Record<string, unknown> | undefined,
): BlockRuntimeContext {
  if (!context) return {};
  return {
    ...context,
  };
}
