import type { TagsCategoriesBlockContent } from "@/blocks/collection/TagsCategories/types";
import { ProcessedText } from "@/blocks/core/components";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";

interface TagsCategoriesData {
  displayTags: Array<{
    slug: string;
    name: string;
    count: number;
    isPlaceholder?: boolean;
  }>;
  displayCategories: Array<{
    id: number;
    slug: string;
    name: string;
    count: number;
    isPlaceholder?: boolean;
  }>;
  [key: string]: unknown;
}

/**
 * TagsCategoriesBlock - 服务端组件
 * 直接使用客户端组件处理布局和导航
 */
export default function TagsCategoriesBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<TagsCategoriesData>(block.runtime);
  const content = (block.content as TagsCategoriesBlockContent) || {};
  const { displayTags = [], displayCategories = [] } = data;

  const footerText = content.footer?.text || ["Tags &", "Categories"];

  return (
    <RowGrid>
      {/* 标签列表 */}
      <GridItem
        areas={[1, 2, 3, 4, 5]}
        mobileAreas={[1, 2, 3, 4, 5, 6]}
        width={6 / 5}
        className="flex items-center justify-center px-10 text-2xl"
      >
        <div
          className="flex-1 flex flex-col gap-2 justify-center items-center"
          data-line-reveal
        >
          {displayTags.map((tag) =>
            tag.isPlaceholder ? (
              <div key={tag.slug}>---</div>
            ) : (
              <Link key={tag.slug} href={`/tags/${tag.slug}`}>
                <div className=" hover:scale-110 transition-all flex items-center gap-2">
                  #
                  <ProcessedText text={tag.name} data={data} inline /> x{" "}
                  {tag.count}
                </div>
              </Link>
            ),
          )}
          <Link href="/tags">
            <div>...</div>
          </Link>
        </div>
      </GridItem>

      {/* 分类列表 */}
      <GridItem
        areas={[6, 7, 8, 9, 10]}
        mobileAreas={[7, 8, 9, 10, 11, 12]}
        width={6 / 5}
        className="flex items-center justify-center px-10 text-2xl"
      >
        <div
          className="flex-1 flex flex-col gap-2 justify-center items-center"
          data-line-reveal
        >
          {displayCategories.map((category) =>
            category.isPlaceholder ? (
              <div key={category.slug}>---</div>
            ) : (
              <Link key={category.slug} href={`/categories/${category.slug}`}>
                <div className=" hover:scale-110 transition-all flex items-center gap-2">
                  <ProcessedText text={category.name} data={data} inline /> x{" "}
                  {category.count}
                </div>
              </Link>
            ),
          )}
          <Link href="/categories">
            <div>...</div>
          </Link>
        </div>
      </GridItem>

      {/* 标题 */}
      <GridItem
        areas={[11, 12]}
        width={6 / 2}
        height={0.25}
        className="flex items-center justify-center uppercase text-5xl bg-primary text-primary-foreground"
      >
        <div>
          {footerText.map((text, index) => (
            <div key={index} data-fade-char>
              <ProcessedText text={text} data={data} inline />
            </div>
          ))}
        </div>
      </GridItem>
    </RowGrid>
  );
}
