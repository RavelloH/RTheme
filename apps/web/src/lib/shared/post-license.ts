import { createElement, type ReactElement } from "react";
import {
  type RemixiconComponentType,
  RiCopyrightLine,
  RiCreativeCommonsByLine,
  RiCreativeCommonsLine,
  RiCreativeCommonsNcLine,
  RiCreativeCommonsNdLine,
  RiCreativeCommonsSaLine,
  RiCreativeCommonsZeroLine,
  RiForbidLine,
  RiLockLine,
} from "@remixicon/react";

export const POST_LICENSE_VALUES = [
  "cc-0",
  "cc-by",
  "cc-by-sa",
  "cc-by-nd",
  "cc-by-nc",
  "cc-by-nc-sa",
  "cc-by-nc-nd",
  "all-rights-reserved",
] as const;

export type PostLicenseValue = (typeof POST_LICENSE_VALUES)[number];
export type PostLicenseSelection = PostLicenseValue | "default";

export const DEFAULT_POST_LICENSE: PostLicenseValue = "all-rights-reserved";
export const DEFAULT_POST_LICENSE_TEMPLATE = "本文原创内容使用{LICENSE}。";
export const ALL_RIGHTS_RESERVED_STATEMENT =
  "All Rights Reserved（保留所有权利，未经授权禁止转载或使用）。";

export interface PostLicenseMeta {
  value: PostLicenseValue;
  icons: readonly [RemixiconComponentType, ...RemixiconComponentType[]];
  shortLabel: string;
  fullLabel: string;
  statementText: string;
  allow: string[];
  disallow: string[];
  referenceUrl?: string;
}

export interface PostLicenseStatementSegment {
  text: string;
  href?: string;
}

const POST_LICENSE_META_MAP: Record<PostLicenseValue, PostLicenseMeta> = {
  "cc-0": {
    value: "cc-0",
    icons: [RiCreativeCommonsLine, RiCreativeCommonsZeroLine],
    shortLabel: "CC0",
    fullLabel: "CC0",
    statementText: "知识共享 CC0 1.0 公共领域贡献 (CC0 1.0)",
    allow: ["允许转载", "允许商业使用", "允许改作", "无需署名即可传播"],
    disallow: ["不能撤销已授予的开放许可", "不得暗示原作者为衍生内容背书"],
    referenceUrl:
      "https://creativecommons.org/publicdomain/zero/1.0/deed.zh-hans",
  },
  "cc-by": {
    value: "cc-by",
    icons: [RiCreativeCommonsLine, RiCreativeCommonsByLine],
    shortLabel: "CC BY",
    fullLabel: "CC BY - 署名",
    statementText: "知识共享 署名 4.0 (CC BY 4.0)协议授权",
    allow: ["允许转载", "允许商业使用", "允许改作", "允许再分发"],
    disallow: ["必须保留署名", "不能删除原始许可声明"],
    referenceUrl: "https://creativecommons.org/licenses/by/4.0/deed.zh-hans",
  },
  "cc-by-sa": {
    value: "cc-by-sa",
    icons: [
      RiCreativeCommonsLine,
      RiCreativeCommonsByLine,
      RiCreativeCommonsSaLine,
    ],
    shortLabel: "CC BY-SA",
    fullLabel: "CC BY-SA - 署名 - 以相同方式分享",
    statementText: "知识共享 署名-相同方式共享 4.0 (CC BY-SA 4.0)协议授权",
    allow: ["允许转载", "允许商业使用", "允许改作", "允许再分发"],
    disallow: ["必须保留署名", "改作后必须使用相同许可继续开放"],
    referenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hans",
  },
  "cc-by-nd": {
    value: "cc-by-nd",
    icons: [
      RiCreativeCommonsLine,
      RiCreativeCommonsByLine,
      RiCreativeCommonsNdLine,
    ],
    shortLabel: "CC BY-ND",
    fullLabel: "CC BY-ND - 署名 - 不可改作",
    statementText: "知识共享 署名-禁止演绎 4.0 (CC BY-ND 4.0)协议授权",
    allow: ["允许转载", "允许商业使用", "允许原样再分发"],
    disallow: ["必须保留署名", "禁止改作和二次创作"],
    referenceUrl: "https://creativecommons.org/licenses/by-nd/4.0/deed.zh-hans",
  },
  "cc-by-nc": {
    value: "cc-by-nc",
    icons: [
      RiCreativeCommonsLine,
      RiCreativeCommonsByLine,
      RiCreativeCommonsNcLine,
    ],
    shortLabel: "CC BY-NC",
    fullLabel: "CC BY-NC - 署名 - 不可商用",
    statementText: "知识共享 署名-非商业性使用 4.0 (CC BY-NC 4.0)协议授权",
    allow: ["允许转载", "允许改作", "允许非商业传播"],
    disallow: ["必须保留署名", "禁止商业使用"],
    referenceUrl: "https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans",
  },
  "cc-by-nc-sa": {
    value: "cc-by-nc-sa",
    icons: [
      RiCreativeCommonsLine,
      RiCreativeCommonsByLine,
      RiCreativeCommonsNcLine,
      RiCreativeCommonsSaLine,
    ],
    shortLabel: "CC BY-NC-SA",
    fullLabel: "CC BY-NC-SA - 署名 - 不可商用 - 以相同方式分享",
    statementText:
      "知识共享 署名-非商业性使用-相同方式共享 4.0 (CC BY-NC-SA 4.0)协议授权",
    allow: ["允许转载", "允许改作", "允许非商业传播"],
    disallow: ["必须保留署名", "禁止商业使用", "改作后必须保持相同许可"],
    referenceUrl:
      "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans",
  },
  "cc-by-nc-nd": {
    value: "cc-by-nc-nd",
    icons: [
      RiCreativeCommonsLine,
      RiCreativeCommonsByLine,
      RiCreativeCommonsNcLine,
      RiCreativeCommonsNdLine,
    ],
    shortLabel: "CC BY-NC-ND",
    fullLabel: "CC BY-NC-ND - 署名 - 不可商用 - 禁止改作",
    statementText:
      "知识共享 署名-非商业性使用-禁止演绎 4.0 (CC BY-NC-ND 4.0)协议授权",
    allow: ["允许转载", "允许非商业原样传播"],
    disallow: ["必须保留署名", "禁止商业使用", "禁止改作和二次创作"],
    referenceUrl:
      "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh-hans",
  },
  "all-rights-reserved": {
    value: "all-rights-reserved",
    icons: [RiCopyrightLine, RiLockLine, RiForbidLine],
    shortLabel: "All Rights Reserved",
    fullLabel: "All Rights Reserved - 保留所有权利 - 未经授权禁止转载或使用",
    statementText: ALL_RIGHTS_RESERVED_STATEMENT,
    allow: ["允许在合理使用范围内引用", "允许阅读与分享链接"],
    disallow: [
      "禁止转载全文",
      "禁止改作",
      "禁止商业使用",
      "禁止未授权的再发布",
    ],
  },
};

const LICENSE_VALUE_SET = new Set<PostLicenseValue>(POST_LICENSE_VALUES);

export const POST_LICENSES: PostLicenseMeta[] = POST_LICENSE_VALUES.map(
  (value) => POST_LICENSE_META_MAP[value],
);

export function isPostLicenseValue(value: unknown): value is PostLicenseValue {
  return (
    typeof value === "string" &&
    LICENSE_VALUE_SET.has(value as PostLicenseValue)
  );
}

export function fromStoredPostLicense(value: unknown): PostLicenseSelection {
  return isPostLicenseValue(value) ? value : "default";
}

export function toStoredPostLicense(
  value: PostLicenseSelection,
): PostLicenseValue | null {
  if (value === "default") {
    return null;
  }
  return value;
}

export function resolvePostLicense(
  storedLicense: unknown,
  defaultLicense: unknown,
): PostLicenseValue {
  if (isPostLicenseValue(storedLicense)) {
    return storedLicense;
  }
  if (isPostLicenseValue(defaultLicense)) {
    return defaultLicense;
  }
  return DEFAULT_POST_LICENSE;
}

export function getPostLicenseMeta(value: PostLicenseValue): PostLicenseMeta {
  return POST_LICENSE_META_MAP[value];
}

export function getPostLicenseIcon(
  value: PostLicenseValue,
): RemixiconComponentType {
  return POST_LICENSE_META_MAP[value].icons[0];
}

export function getPostLicenseIcons(
  value: PostLicenseValue,
): readonly RemixiconComponentType[] {
  return POST_LICENSE_META_MAP[value].icons;
}

export function renderPostLicenseIcon(
  value: PostLicenseValue,
  className?: string,
): ReactElement {
  const icons = getPostLicenseIcons(value);
  return createElement(
    "span",
    {
      className: `inline-flex items-center gap-1 ${className ?? ""}`.trim(),
    },
    ...icons.map((Icon, index) =>
      createElement(Icon, {
        key: `${value}-icon-${index}`,
        size: "1.1em",
      }),
    ),
  );
}

export function getPostLicenseSelectionLabel(
  value: PostLicenseSelection,
): string {
  if (value === "default") {
    return "默认（跟随站点设置）";
  }
  return POST_LICENSE_META_MAP[value].fullLabel;
}

function normalizePostLicenseTemplate(template: unknown): string {
  if (typeof template === "string" && template.trim().length > 0) {
    return template;
  }
  return DEFAULT_POST_LICENSE_TEMPLATE;
}

export function formatPostLicenseStatementSegments(
  template: unknown,
  license: PostLicenseValue,
): PostLicenseStatementSegment[] {
  if (license === "all-rights-reserved") {
    return [{ text: ALL_RIGHTS_RESERVED_STATEMENT }];
  }

  const normalizedTemplate = normalizePostLicenseTemplate(template);
  const { statementText, referenceUrl } = getPostLicenseMeta(license);

  if (!normalizedTemplate.includes("{LICENSE}")) {
    if (!referenceUrl) {
      return [{ text: `${normalizedTemplate}${statementText}` }];
    }

    return [
      { text: normalizedTemplate },
      { text: statementText, href: referenceUrl },
    ];
  }

  const templateParts = normalizedTemplate.split("{LICENSE}");
  const segments: PostLicenseStatementSegment[] = [];

  templateParts.forEach((part, index) => {
    if (part.length > 0) {
      segments.push({ text: part });
    }

    if (index >= templateParts.length - 1) {
      return;
    }

    if (referenceUrl) {
      segments.push({ text: statementText, href: referenceUrl });
      return;
    }

    segments.push({ text: statementText });
  });

  return segments;
}

export function formatPostLicenseStatement(
  template: unknown,
  license: PostLicenseValue,
): string {
  return formatPostLicenseStatementSegments(template, license)
    .map((segment) => segment.text)
    .join("");
}
