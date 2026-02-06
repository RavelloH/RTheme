import * as RemixIcon from "@remixicon/react";

import type {
  CardsBlockConfig,
  CardsData,
} from "@/blocks/collection/Cards/types";
import { ProcessedText } from "@/blocks/core/components";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import CMSImage from "@/components/ui/CMSImage";
import Link from "@/components/ui/Link";
import { createArray } from "@/lib/client/create-array";

/**
 * 动态图标组件
 */
function Icon({ name, className }: { name: string; className?: string }) {
  const convertToComponentName = (iconName: string): string => {
    const parts = iconName.split("-");
    const converted = parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    return `Ri${converted}`;
  };

  const componentName = convertToComponentName(name);
  const IconComponent = (
    RemixIcon as Record<string, React.ComponentType<{ className?: string }>>
  )[componentName];

  if (!IconComponent) {
    return <RemixIcon.RiQuestionLine className={className} />;
  }

  return <IconComponent className={className} />;
}

// ===== 样式映射 =====

const ICON_SIZE_CLASSES = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-14 h-14",
};

const ICON_COLOR_CLASSES = {
  primary: "text-primary",
  secondary: "text-secondary",
  muted: "text-muted-foreground",
  inherit: "",
};

const ICON_BG_CLASSES = {
  none: "",
  circle: "p-3 rounded-full bg-primary/10",
  square: "p-3 bg-primary/10",
  rounded: "p-3 rounded-lg bg-primary/10",
};

const HEIGHT_RATIO_CLASSES = {
  "1/4": "h-1/4",
  "1/3": "h-1/3",
  "1/2": "h-1/2",
  "2/3": "h-2/3",
  "3/4": "h-3/4",
};

const FILTER_CLASSES = {
  none: "",
  grayscale: "grayscale",
  sepia: "sepia",
  contrast: "contrast-125",
  brightness: "brightness-75",
};

const OVERLAY_CLASSES = {
  none: "",
  // 底部渐变：从透明到半透明，适合底部有文字
  "gradient-bottom":
    "after:absolute after:inset-0 after:bg-gradient-to-t after:from-background after:via-background/40 after:to-transparent",
  // 全覆盖渐变：柔和的整体遮罩
  "gradient-full":
    "after:absolute after:inset-0 after:bg-gradient-to-br after:from-background after:via-transparent after:to-background",
  // 暗化：使用 backdrop-filter
  dark: "after:absolute after:inset-0 after:bg-background/40 after:backdrop-brightness-75",
  // 亮化：提升亮度
  light:
    "after:absolute after:inset-0 after:bg-background/20 after:backdrop-brightness-110",
  // 模糊效果
  blur: "after:absolute after:inset-0 after:backdrop-blur-sm",
  // 晕影效果：边缘渐变暗
  vignette:
    "after:absolute after:inset-0 after:shadow-[inset_0_0_100px_20px_rgba(0,0,0,0.4)]",
};

const ALIGN_CLASSES = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

const VERTICAL_ALIGN_CLASSES = {
  top: "justify-start",
  center: "justify-center",
  bottom: "justify-end",
};

const PADDING_CLASSES = {
  none: "p-0",
  sm: "p-3",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

const TITLE_SIZE_CLASSES = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
  "2xl": "text-4xl",
};

const DESC_SIZE_CLASSES = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const ROUNDED_CLASSES = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-3xl",
};

const BG_COLOR_CLASSES = {
  default: "bg-background",
  muted: "bg-muted",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  transparent: "bg-transparent",
};

/**
 * CardsBlock - 服务端组件
 */
export default function CardsBlock({ config }: { config: CardsBlockConfig }) {
  const { content } = config;
  const data = (config.data as CardsData) || {};

  // 内容
  const title = content.title;
  const subtitle = content.subtitle;
  const description = content.description;
  const icon = content.icon;
  const link = content.link;
  const linkText = content.linkText;
  const tags = content.tags;
  const badge = content.badge;

  // 图标设置
  const iconSize = content.iconSettings?.size || "lg";
  const iconColor = content.iconSettings?.color || "primary";
  const iconPosition = content.iconSettings?.position || "above-title";
  const iconBackground = content.iconSettings?.background || "none";

  // 图片设置
  const imagePosition = content.layout?.imagePosition || "top";
  const objectFit = content.imageSettings?.objectFit || "cover";
  const heightRatio = content.imageSettings?.heightRatio || "1/2";
  const filter = content.imageSettings?.filter || "none";
  const overlay = content.imageSettings?.overlay || "none";
  const showIconWithImage = content.imageSettings?.showIconWithImage ?? false;

  // 内容设置
  const align = content.contentSettings?.align || "left";
  const verticalAlign = content.contentSettings?.verticalAlign || "center";
  const padding = content.contentSettings?.padding || "md";
  const titleSize = content.contentSettings?.titleSize || "lg";
  const descriptionSize = content.contentSettings?.descriptionSize || "sm";

  // 样式设置
  const rounded = content.styleSettings?.rounded || "lg";
  const bgColor = content.styleSettings?.bgColor || "default";
  const hoverEffect = content.styleSettings?.hoverEffect || "lift";

  // 布局
  const ratio = content.layout?.ratio ?? 1;

  // 动画设置
  const enableTextAnimation =
    content.animationSettings?.enableTextAnimation ?? true;

  // 图片数据
  const imageData = data.image;
  const imageSrc = imageData?.url || content.image;
  const imageWidth = imageData?.width;
  const imageHeight = imageData?.height;
  const imageBlur = imageData?.blur;

  const hasImage = !!imageSrc;
  const hasLink = !!link;
  const hasIcon = !!icon;
  const shouldShowIcon = hasIcon && (!hasImage || showIconWithImage);
  const isImageSide = imagePosition === "left" || imagePosition === "right";
  const isImageBackground = imagePosition === "background";
  const hasLinkButton = !!linkText && hasLink;

  // ===== 生成样式类 =====
  const getVariantClasses = () => {
    const base = "group relative overflow-hidden transition-all duration-300";
    return `${base} ${BG_COLOR_CLASSES[bgColor]}`;
  };

  const getHoverClasses = () => {
    switch (hoverEffect) {
      case "lift":
        return "group-hover:-translate-y-6 transition-all duration-300";
      case "scale":
        return "group-hover:scale-[1.02] transition-all duration-300";
      case "glow":
        return "group-hover:brightness-150 transition-all duration-300";
      default:
        return "";
    }
  };

  const getImageClasses = () => {
    const fitClass =
      objectFit === "cover"
        ? "object-cover"
        : objectFit === "contain"
          ? "object-contain"
          : "object-fill";
    return `transition-transform duration-500 group-hover:scale-105 ${fitClass} ${FILTER_CLASSES[filter]}`;
  };

  const getIconClasses = () => {
    return `${ICON_SIZE_CLASSES[iconSize]} ${ICON_COLOR_CLASSES[iconColor]}`;
  };

  const cardClasses = `${getVariantClasses()} ${ROUNDED_CLASSES[rounded]}`;

  // ===== 渲染图标 =====
  const renderIcon = () => {
    if (!shouldShowIcon) return null;

    const iconElement = <Icon name={icon!} className={getIconClasses()} />;

    if (iconBackground !== "none") {
      return (
        <div className={ICON_BG_CLASSES[iconBackground]}>{iconElement}</div>
      );
    }

    return iconElement;
  };

  // ===== 渲染背景图标（装饰） =====
  const renderBackgroundIcon = () => {
    if (!hasIcon || iconPosition !== "background") return null;

    // 根据 padding 设置获取对应的间距值
    const paddingInset = {
      none: "0",
      sm: "3",
      md: "6",
      lg: "8",
      xl: "10",
    }[padding];

    // 水平位置：左对齐时图标在右，右对齐时图标在左，居中时图标也居中
    const horizontalClass =
      align === "left"
        ? `right-${paddingInset}`
        : align === "right"
          ? `left-${paddingInset}`
          : "left-1/2 -translate-x-1/2";

    // 垂直位置：如果水平居中，则图标和内容错开
    let verticalClass;
    if (align === "center") {
      // 水平居中时，垂直位置与内容错开
      if (verticalAlign === "bottom") {
        // 内容在下，图标在上
        verticalClass = `top-${paddingInset}`;
      } else {
        // 内容在上或居中，图标在下
        verticalClass = `bottom-${paddingInset}`;
      }
    } else {
      // 非居中时，跟随内容的垂直对齐
      verticalClass =
        verticalAlign === "top"
          ? `top-${paddingInset}`
          : verticalAlign === "bottom"
            ? `bottom-${paddingInset}`
            : "top-1/2 -translate-y-1/2";
    }

    return (
      <div
        className={`absolute ${horizontalClass} ${verticalClass} opacity-5 pointer-events-none ${bgColor === "primary" && "opacity-30"}`}
      >
        <Icon name={icon!} className="w-48 h-48" />
      </div>
    );
  };

  // ===== 渲染徽章 =====
  const renderBadge = () => {
    if (!badge) return null;

    return (
      <span className="absolute top-3 right-3 px-2 py-1 text-sm font-medium bg-primary text-primary-foreground rounded-full z-20">
        <ProcessedText text={badge} data={data} inline disableMarkdown />
      </span>
    );
  };

  // ===== 渲染图片 =====
  const renderImage = () => {
    if (!hasImage || isImageBackground) return null;

    const imageContainerClass = isImageSide
      ? "w-2/5 flex-shrink-0"
      : `${HEIGHT_RATIO_CLASSES[heightRatio]} flex-shrink-0`;

    return (
      <div
        className={`relative overflow-hidden ${imageContainerClass} ${OVERLAY_CLASSES[overlay]}`}
      >
        <CMSImage
          src={imageSrc!}
          alt={title || ""}
          fill
          width={imageWidth}
          height={imageHeight}
          blur={imageBlur}
          className={getImageClasses()}
        />
      </div>
    );
  };

  // ===== 渲染背景图片 =====
  const renderBackgroundImage = () => {
    if (!hasImage || !isImageBackground) return null;

    return (
      <>
        <CMSImage
          src={imageSrc!}
          alt={title || ""}
          fill
          width={imageWidth}
          height={imageHeight}
          blur={imageBlur}
          className={getImageClasses()}
        />
        {/* 使用主题色渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
      </>
    );
  };

  // ===== 渲染内容 =====
  const renderContent = () => {
    const contentClasses = `
      flex-1 flex flex-col  ${getHoverClasses()} ${PADDING_CLASSES[padding]}
      ${ALIGN_CLASSES[align]} ${VERTICAL_ALIGN_CLASSES[verticalAlign]}
      ${isImageBackground ? "relative z-20 text-white" : "relative"}
    `;

    return (
      <div className={contentClasses}>
        {/* 背景装饰图标 */}
        {renderBackgroundIcon()}

        {/* 图标（标题上方） */}
        {iconPosition === "above-title" && renderIcon() && (
          <div className="mb-4">{renderIcon()}</div>
        )}

        {/* 标题行（可能包含图标） */}
        <div
          className={`flex items-center gap-3 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""}`}
        >
          {iconPosition === "before-title" && renderIcon()}
          {title && (
            <h3
              className={`font-semibold ${TITLE_SIZE_CLASSES[titleSize]}`}
              {...(enableTextAnimation ? { "data-fade-char": true } : {})}
            >
              <ProcessedText text={title} data={data} inline />
            </h3>
          )}
        </div>

        {/* 副标题 */}
        {subtitle && (
          <p
            className={`text-muted-foreground mt-1 ${bgColor === "primary" && "text-primary-foreground"}`}
          >
            <ProcessedText text={subtitle} data={data} inline />
          </p>
        )}

        {/* 描述 */}
        {description && (
          <p
            className={`mt-3 ${DESC_SIZE_CLASSES[descriptionSize]} ${
              isImageBackground ? "text-white/80" : "text-muted-foreground"
            } ${bgColor === "primary" && "text-primary-foreground"}`}
            {...(enableTextAnimation ? { "data-line-reveal": true } : {})}
          >
            <ProcessedText text={description} data={data} inline />
          </p>
        )}

        {/* 标签 */}
        {tags && tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-xs font-mono text-sm  ${bgColor === "primary" ? "text-primary-foreground bg-foreground" : "bg-primary/10 text-primary"}`}
              >
                <ProcessedText text={tag} data={data} inline disableMarkdown />
              </span>
            ))}
          </div>
        )}

        {/* 链接按钮 */}
        {hasLinkButton && (
          <Link className="mt-4" href={link || ""}>
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium ${bgColor == "primary" ? "bg-foreground" : "bg-primary text-primary-foreground"} rounded-sm hover:bg-primary/70 transition-colors cursor-pointer`}
            >
              <ProcessedText
                text={linkText!}
                data={data}
                inline
                disableMarkdown
              />
              <RemixIcon.RiArrowRightLine className="w-4 h-4" />
            </span>
          </Link>
        )}
      </div>
    );
  };

  // ===== 组装卡片内容 =====
  const cardContent = (
    <div
      className={`h-full flex ${
        isImageSide
          ? imagePosition === "right"
            ? "flex-row-reverse"
            : "flex-row"
          : "flex-col"
      }`}
    >
      {renderBackgroundImage()}
      {renderBadge()}
      {renderImage()}
      {renderContent()}
    </div>
  );

  // ===== 最终渲染 =====
  return (
    <RowGrid>
      <GridItem
        areas={createArray(1, 12)}
        width={ratio}
        height={ratio}
        fixedHeight
        className={cardClasses}
      >
        {hasLink && !hasLinkButton ? (
          <Link href={link!} className="block h-full">
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}
      </GridItem>
    </RowGrid>
  );
}
