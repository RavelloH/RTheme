import InvalidFriendLinksList from "@/blocks/collection/InvalidFriendLinks/client/InvalidFriendLinksList";
import type {
  InvalidFriendLinksBlockConfig,
  InvalidFriendLinksData,
} from "@/blocks/collection/InvalidFriendLinks/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { createArray } from "@/lib/client/create-array";

export default function InvalidFriendLinksBlock({
  block,
}: BlockComponentProps) {
  const content =
    (block.content as InvalidFriendLinksBlockConfig["content"]) || {};
  const data = getBlockRuntimeData<InvalidFriendLinksData>(block.runtime);

  const headerText =
    typeof content.headerText === "string" && content.headerText.trim()
      ? content.headerText.trim()
      : "失效友情链接";
  const showAsLink = content.showAsLink ?? false;
  const showDuration = content.showDuration ?? true;
  const links = data.links || [];

  return (
    <RowGrid>
      <GridItem
        areas={createArray(1, 12)}
        width={1.05}
        height={1}
        className="overflow-hidden"
      >
        <InvalidFriendLinksList
          headerText={headerText}
          links={links}
          showAsLink={showAsLink}
          showDuration={showDuration}
        />
      </GridItem>
    </RowGrid>
  );
}
