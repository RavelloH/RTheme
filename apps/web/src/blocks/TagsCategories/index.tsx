import RowGrid, { GridItem } from "@/components/RowGrid";
import Link from "@/components/Link";
import type { BlockConfig } from "@/blocks/types";

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
}

/**
 * TagsCategoriesBlock - 服务端组件
 * 直接使用客户端组件处理布局和导航
 */
export default function TagsCategoriesBlock({
  config,
}: {
  config: BlockConfig;
}) {
  const data = (config.data as TagsCategoriesData) || {};
  const { displayTags = [], displayCategories = [] } = data;

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
          className="flex flex-col gap-2 justify-center items-center"
          data-line-reveal
        >
          {displayTags.map((tag) =>
            tag.isPlaceholder ? (
              <div key={tag.slug}>---</div>
            ) : (
              <Link key={tag.slug} href={`/tags/${tag.slug}`}>
                <div className=" hover:scale-110 transition-all">
                  #{tag.name} x {tag.count}
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
          className="flex flex-col gap-2 justify-center items-center"
          data-line-reveal
        >
          {displayCategories.map((category) =>
            category.isPlaceholder ? (
              <div key={category.slug}>---</div>
            ) : (
              <Link key={category.slug} href={`/categories/${category.slug}`}>
                <div className=" hover:scale-110 transition-all">
                  {category.name} x {category.count}
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
          <div data-fade-char>Tags &</div>
          <div data-fade-char>Categories</div>
        </div>
      </GridItem>
    </RowGrid>
  );
}
