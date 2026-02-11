import type {
  ArchiveListBlockConfig,
  ArchiveListData,
  ArchiveListItem,
  ArchiveListMonthGroup,
} from "@/blocks/collection/ArchiveList/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import { createArray } from "@/lib/client/create-array";

const FULL_AREAS = createArray(1, 12);
const MONTH_ITEMS_PER_COLUMN = 14;
const MONTH_CARD_BASE_WIDTH_REM = 22;
const MONTH_CARD_EXTRA_WIDTH_REM = 22;
const MONTH_TEXT_COLUMN_WIDTH_REM = 22;

function splitItemsByColumn<T>(items: T[], itemsPerColumn: number): T[][] {
  if (items.length === 0) return [];
  if (itemsPerColumn <= 0) return [items];

  const columns: T[][] = [];
  for (let i = 0; i < items.length; i += itemsPerColumn) {
    columns.push(items.slice(i, i + itemsPerColumn));
  }

  return columns;
}

function VerticalArchiveList({
  monthGroups,
}: {
  monthGroups: ArchiveListMonthGroup[];
}) {
  return (
    <GridItem areas={FULL_AREAS} className="bg-background">
      <div className="md:hidden h-full overflow-y-auto">
        <div className="flex flex-col">
          {monthGroups.map((group) => (
            <GridItem
              key={`${group.key}-mobile`}
              areas={FULL_AREAS}
              className="h-auto w-full bg-background p-6"
            >
              <section className="flex flex-col">
                <header className="space-y-1">
                  <p className="text-xs tracking-[0.18em] text-muted-foreground">
                    {group.year}
                  </p>
                  <h3 className="text-3xl font-medium tabular-nums">
                    {group.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {group.items.length} 篇
                  </p>
                </header>

                <ul className="mt-4 space-y-2">
                  {group.items.map((item) => (
                    <li key={`${item.id}-${item.publishedAt}-mobile`}>
                      <Link
                        href={item.slug ? `/posts/${item.slug}` : "#"}
                        className="group flex min-w-0 items-center gap-3 py-1"
                      >
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {item.monthDay}
                        </span>
                        <span
                          className="min-w-0 flex-1 truncate text-base leading-relaxed transition-colors group-hover:text-primary"
                          data-fade-word
                        >
                          {item.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </GridItem>
          ))}
        </div>
      </div>

      <div className="hidden md:flex h-full w-max flex-nowrap items-start">
        {monthGroups.map((group) => {
          const columns = splitItemsByColumn(
            group.items,
            MONTH_ITEMS_PER_COLUMN,
          );
          const cardWidthRem =
            MONTH_CARD_BASE_WIDTH_REM +
            Math.max(0, columns.length - 1) * MONTH_CARD_EXTRA_WIDTH_REM;

          return (
            <GridItem
              key={group.key}
              areas={FULL_AREAS}
              className="h-full w-auto shrink-0 bg-background p-10"
            >
              <section
                className="flex flex-col"
                style={{
                  width: `${cardWidthRem}rem`,
                  minHeight: `${cardWidthRem}rem`,
                }}
              >
                <header className="space-y-1">
                  <p className="text-xs tracking-[0.18em] text-muted-foreground">
                    {group.year}
                  </p>
                  <h3 className="text-3xl md:text-4xl font-medium tabular-nums">
                    {group.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {group.items.length} 篇
                  </p>
                </header>

                <div className="mt-5 flex-1 min-h-0">
                  <div className="flex h-full items-start gap-6">
                    {columns.map((columnItems, columnIndex) => (
                      <ul
                        key={`${group.key}-col-${columnIndex}`}
                        className="shrink-0 space-y-2"
                        style={{ width: `${MONTH_TEXT_COLUMN_WIDTH_REM}rem` }}
                      >
                        {columnItems.map((item) => (
                          <li key={`${item.id}-${item.publishedAt}`}>
                            <Link
                              href={item.slug ? `/posts/${item.slug}` : "#"}
                              className="group flex min-w-0 items-center gap-3 py-1"
                            >
                              <span className="mt-0.5 shrink-0 text-sm tabular-nums text-muted-foreground">
                                {item.monthDay}
                              </span>
                              <span
                                className="min-w-0 flex-1 truncate text-sm leading-relaxed transition-colors group-hover:text-primary md:text-base"
                                data-fade-word
                              >
                                {item.title}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </div>
              </section>
            </GridItem>
          );
        })}
      </div>
    </GridItem>
  );
}

function HorizontalArchiveTimeline({ items }: { items: ArchiveListItem[] }) {
  return (
    <div className="h-full">
      <div className="md:hidden h-full overflow-y-auto">
        <div className="px-4 py-6">
          {items.map((item, index) => {
            const previousItem = items[index - 1];
            const showYear = index === 0 || previousItem?.year !== item.year;
            const isFirst = index === 0;
            const isLast = index === items.length - 1;
            const lineClass =
              items.length <= 1
                ? ""
                : isFirst
                  ? "top-1/2 bottom-0"
                  : isLast
                    ? "top-0 bottom-1/2"
                    : "inset-y-0";

            return (
              <Link
                key={`${item.id}-${item.publishedAt}`}
                href={item.slug ? `/posts/${item.slug}` : "#"}
                className="group grid min-h-16 grid-cols-[3.5rem_1rem_minmax(0,1fr)] items-center gap-x-3"
              >
                <div className="text-right leading-none">
                  {showYear ? (
                    <div className="h-4 text-[10px] tracking-[0.2em] text-foreground">
                      {item.year}
                    </div>
                  ) : null}
                  <div
                    className={`text-xs tabular-nums text-muted-foreground ${showYear ? "mt-1" : ""}`}
                  >
                    {item.monthDay}
                  </div>
                </div>

                <div className="relative flex h-full items-center justify-center">
                  {lineClass ? (
                    <span
                      className={`absolute left-1/2 w-px -translate-x-1/2 bg-border ${lineClass}`}
                    />
                  ) : null}
                  <span className="relative h-2.5 w-2.5 rounded-full border border-primary/40 bg-background transition-all duration-200 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary" />
                </div>

                <div className="min-w-0 py-3">
                  <div
                    className="text-base font-medium leading-snug text-foreground transition-colors duration-200 group-hover:text-primary"
                    data-fade-word
                  >
                    {item.title}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block h-full overflow-x-auto">
        <div className="inline-flex h-full min-h-[18rem] min-w-full items-stretch px-10 py-10">
          {items.map((item, index) => {
            const previousItem = items[index - 1];
            const showYear = index === 0 || previousItem?.year !== item.year;
            const isFirst = index === 0;
            const isLast = index === items.length - 1;

            return (
              <Link
                key={`${item.id}-${item.publishedAt}`}
                href={item.slug ? `/posts/${item.slug}` : "#"}
                className="group flex min-h-0 w-16 shrink-0 flex-col items-center"
              >
                <span className="h-5 text-xs tracking-[0.2em] text-foreground">
                  {showYear ? item.year : "\u00A0"}
                </span>

                <span className="mt-0.5 h-4 text-xs tabular-nums text-muted-foreground">
                  {item.monthDay}
                </span>

                <span className="relative mt-0.5 h-5 w-full">
                  {!isFirst && (
                    <span className="absolute left-0 right-1/2 top-1/2 h-px bg-border" />
                  )}
                  {!isLast && (
                    <span className="absolute left-1/2 right-0 top-1/2 h-px bg-border" />
                  )}
                  <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-background transition-all duration-200 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary" />
                </span>

                <span className="mt-4 flex flex-1 min-h-0 w-full items-start justify-center overflow-hidden text-xl leading-tight tracking-[4px] text-foreground transition-colors duration-200 group-hover:text-primary">
                  <span
                    className="inline-block h-full"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }}
                    data-fade-word
                  >
                    {item.title}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * ArchiveListBlock - 服务端组件
 * 支持竖向按月列展示和横向时间线展示两种归档布局。
 */
export default function ArchiveListBlock({ block }: BlockComponentProps) {
  const content = block.content as ArchiveListBlockConfig["content"];
  const data = getBlockRuntimeData<ArchiveListData>(block.runtime);

  const mode = content.layout?.mode || "vertical";
  const items = data.items || [];
  const monthGroups = data.monthGroups || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {mode === "horizontal" ? (
        <GridItem areas={FULL_AREAS} className="overflow-hidden bg-background">
          <HorizontalArchiveTimeline items={items} />
        </GridItem>
      ) : (
        <VerticalArchiveList monthGroups={monthGroups} />
      )}
    </>
  );
}
