import FriendLinksGrid from "@/blocks/collection/FriendLinks/client/FriendLinksGrid";
import type { FriendLinksData } from "@/blocks/collection/FriendLinks/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";

export default function FriendLinksBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<FriendLinksData>(block.runtime);

  return (
    <FriendLinksGrid
      links={data.links || []}
      randomEnabled={data.randomEnabled}
      limit={data.limit}
    />
  );
}
