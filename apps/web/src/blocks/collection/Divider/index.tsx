import DividerBlockWrapper from "@/blocks/collection/Divider/client/DividerWrapper";
import type { DividerBlockConfig } from "@/blocks/collection/Divider/types";

export default function DividerBlock({
  config,
}: {
  config: DividerBlockConfig;
}) {
  return <DividerBlockWrapper config={config} />;
}
