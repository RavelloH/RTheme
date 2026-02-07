import type {
  AuthorBlockConfig,
  AuthorData,
} from "@/blocks/collection/Author/types";
import { ProcessedText } from "@/blocks/core/components";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import CMSImage from "@/components/ui/CMSImage";

/**
 * AuthorBlock - 服务端组件
 * 展示作者/个人信息卡片
 */
export default function AuthorBlock({ block }: BlockComponentProps) {
  const content = block.content as AuthorBlockConfig["content"];
  const data = getBlockRuntimeData<AuthorData>(block.runtime);

  const name = content.name || "";
  const title = content.title || "";
  const bio = content.bio || [];
  const avatarShape = content.layout?.avatarShape || "circle";
  const ratio = content.layout?.ratio ?? 1;

  // 获取处理后的头像数据
  const avatarData = data.avatar;
  const avatarSrc = avatarData?.url || content.avatar;

  const avatarShapeClass = {
    circle: "rounded-full",
    square: "rounded-none",
    rounded: "rounded-2xl",
  }[avatarShape];

  return (
    <RowGrid>
      {/* 头像区域 */}
      <GridItem
        areas={[1, 2, 3, 4]}
        width={(ratio * 14) / 4}
        height={0.3}
        className="flex items-center justify-center"
      >
        {avatarSrc ? (
          <div
            className={`w-40 h-40 relative overflow-hidden ${avatarShapeClass}`}
          >
            <CMSImage
              src={avatarSrc}
              alt={name}
              fill
              width={avatarData?.width}
              height={avatarData?.height}
              blur={avatarData?.blur}
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className={`w-40 h-40 bg-primary/20 flex items-center justify-center text-6xl font-bold text-primary ${avatarShapeClass}`}
          >
            {name ? name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
      </GridItem>

      {/* 姓名 + 职位 */}
      <GridItem
        areas={[5, 6, 7, 8]}
        width={(ratio * 14) / 4}
        height={0.4}
        className="flex flex-col items-center justify-center px-10"
      >
        {name && (
          <h2 className="text-5xl font-bold mb-3" data-fade-char>
            <ProcessedText text={name} data={data} inline />
          </h2>
        )}
        {title && (
          <div
            className="text-2xl text-muted-foreground uppercase tracking-[0.15em]"
            data-line-reveal
          >
            <ProcessedText text={title} data={data} inline />
          </div>
        )}
      </GridItem>

      {/* 简介 */}
      <GridItem
        areas={[9, 10, 11, 12]}
        width={(ratio * 14) / 4}
        height={0.3}
        className="flex flex-col items-center justify-center px-10 text-xl text-center"
      >
        <div className="space-y-2" data-line-reveal>
          {bio.map((line, index) => (
            <div key={index} className="text-muted-foreground">
              <ProcessedText text={line} data={data} inline />
            </div>
          ))}
        </div>
      </GridItem>
    </RowGrid>
  );
}
