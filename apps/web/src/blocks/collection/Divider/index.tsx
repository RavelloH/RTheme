import DividerBlockWrapper from "@/blocks/collection/Divider/client/DividerWrapper";
import type { BlockComponentProps } from "@/blocks/core/definition";

export default function DividerBlock({ block, mode }: BlockComponentProps) {
  return <DividerBlockWrapper block={block} mode={mode} />;
}
