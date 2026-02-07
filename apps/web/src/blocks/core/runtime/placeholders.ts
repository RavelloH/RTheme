import type { BlockRuntimeContext } from "@/blocks/core/definition";
import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";

export async function resolveBlockPlaceholders(params: {
  content: unknown;
  context: BlockRuntimeContext;
  enabled: boolean;
  withContext: boolean;
}): Promise<Record<string, unknown>> {
  if (!params.enabled) {
    return {};
  }

  return fetchBlockInterpolatedData(
    params.content,
    params.withContext ? params.context : undefined,
  );
}
