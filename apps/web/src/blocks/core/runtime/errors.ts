export type BlockRuntimeStage =
  | "definition"
  | "content"
  | "placeholders"
  | "media"
  | "business"
  | "render";

export class BlockRuntimeError extends Error {
  constructor(
    readonly code: string,
    readonly stage: BlockRuntimeStage,
    readonly blockType: string,
    readonly blockId: string | number,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BlockRuntimeError";
  }
}

export function toRuntimeErrorItem(error: BlockRuntimeError): {
  code: string;
  message: string;
  stage: BlockRuntimeStage;
} {
  return {
    code: error.code,
    message: error.message,
    stage: error.stage,
  };
}

export function wrapRuntimeError(params: {
  code: string;
  stage: BlockRuntimeStage;
  blockType: string;
  blockId: string | number;
  message: string;
  cause?: unknown;
}): BlockRuntimeError {
  return new BlockRuntimeError(
    params.code,
    params.stage,
    params.blockType,
    params.blockId,
    params.message,
    params.cause,
  );
}
