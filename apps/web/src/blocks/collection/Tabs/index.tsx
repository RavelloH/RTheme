import TabsContent from "@/blocks/collection/Tabs/client/TabsContent";
import type {
  TabItem,
  TabsBlockConfig,
  TabsData,
} from "@/blocks/collection/Tabs/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";

/**
 * TabsBlock - 服务端组件
 * 选项卡面板
 */
export default function TabsBlock({ block }: BlockComponentProps) {
  const content = block.content as TabsBlockConfig["content"];
  const data = getBlockRuntimeData<TabsData>(block.runtime);

  // 从显式字段构建选项卡数组（最多 10 个）
  const tabs: TabItem[] = [];
  const tabKeys: Array<`no${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`> = [
    "no1",
    "no2",
    "no3",
    "no4",
    "no5",
    "no6",
    "no7",
    "no8",
    "no9",
    "no10",
  ];

  for (const key of tabKeys) {
    const tabField = content[key];
    if (
      tabField &&
      typeof tabField === "object" &&
      "label" in tabField &&
      typeof tabField.label === "string" &&
      tabField.label.trim() !== ""
    ) {
      tabs.push({
        label: tabField.label,
        content: tabField.content,
      });
    }
  }

  const tabPosition = content.layout?.tabPosition || "top";
  const style = content.layout?.style || "underline";
  const ratio = content.layout?.ratio ?? 1;
  const tabsCentered = content.layout?.tabsCentered ?? false;
  const contentAlign = content.layout?.contentAlign || "left";
  const contentVerticalAlign = content.layout?.contentVerticalAlign || "top";

  if (tabs.length === 0) {
    return null;
  }

  return (
    <RowGrid>
      <GridItem
        areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
        width={ratio}
        height={1}
        className="px-10 py-8"
      >
        <TabsContent
          tabs={tabs}
          data={data}
          tabPosition={tabPosition}
          style={style}
          tabsCentered={tabsCentered}
          contentAlign={contentAlign}
          contentVerticalAlign={contentVerticalAlign}
        />
      </GridItem>
    </RowGrid>
  );
}
