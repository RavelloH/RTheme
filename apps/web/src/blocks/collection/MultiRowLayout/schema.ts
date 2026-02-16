import type {
  BlockFormConfig,
  FieldCondition,
  FieldConfig,
} from "@/blocks/core/types/field-config";

type RowKey = `row${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

const ROW_VISIBILITY_MAP: Record<number, number[]> = {
  1: [1, 2, 3, 4, 6, 12],
  2: [2, 3, 4, 6, 12],
  3: [3, 4, 6, 12],
  4: [4, 6, 12],
  5: [6, 12],
  6: [6, 12],
  7: [12],
  8: [12],
  9: [12],
  10: [12],
  11: [12],
  12: [12],
};

const mergeConditions = (
  ...conditions: Array<FieldCondition | undefined>
): FieldCondition | undefined => {
  const merged: FieldCondition = {};

  for (const condition of conditions) {
    if (!condition) continue;

    if (condition.and?.length) {
      merged.and = [...(merged.and ?? []), ...condition.and];
    }
    if (condition.or?.length) {
      merged.or = [...(merged.or ?? []), ...condition.or];
    }
    if (condition.not?.length) {
      merged.not = [...(merged.not ?? []), ...condition.not];
    }
  }

  if (!merged.and && !merged.or && !merged.not) return undefined;
  return merged;
};

const createRowVisibilityCondition = (
  rowIndex: number,
): FieldCondition | undefined => {
  if (rowIndex === 1) return undefined;

  const visibleRowCounts = ROW_VISIBILITY_MAP[rowIndex] ?? [12];

  return {
    or: visibleRowCounts.flatMap((rowCount) => [
      { field: "rowCount", value: String(rowCount) },
      { field: "rowCount", value: rowCount },
    ]),
  };
};

const createTextTypeCondition = (rowKey: RowKey): FieldCondition => ({
  not: [
    { field: `${rowKey}.type`, value: "image" },
    { field: `${rowKey}.type`, value: "marquee" },
  ],
});

const createExactTypeCondition = (
  rowKey: RowKey,
  type: "image" | "marquee",
): FieldCondition => ({
  and: [{ field: `${rowKey}.type`, value: type }],
});

// 创建单行的所有字段
const createRowFields = (rowIndex: number, rowKey: RowKey): FieldConfig[] => {
  const fields: FieldConfig[] = [];
  const rowVisibilityCondition = createRowVisibilityCondition(rowIndex);

  const textTypeCondition = mergeConditions(
    rowVisibilityCondition,
    createTextTypeCondition(rowKey),
  );

  const imageTypeCondition = mergeConditions(
    rowVisibilityCondition,
    createExactTypeCondition(rowKey, "image"),
  );

  const marqueeTypeCondition = mergeConditions(
    rowVisibilityCondition,
    createExactTypeCondition(rowKey, "marquee"),
  );

  // 行类型
  fields.push({
    label: `第 ${rowIndex} 行类型`,
    path: `${rowKey}.type`,
    type: "select",
    options: [
      { label: "文字", value: "text" },
      { label: "图片", value: "image" },
      { label: "跑马灯", value: "marquee" },
    ],
    defaultValue: "text",
    condition: rowVisibilityCondition,
  });

  // 背景颜色（所有类型通用）
  fields.push({
    label: `第 ${rowIndex} 行背景颜色`,
    path: `${rowKey}.backgroundColor`,
    type: "select",
    options: [
      { label: "默认", value: "default" },
      { label: "柔和", value: "muted" },
      { label: "主色", value: "primary" },
      { label: "次要色", value: "secondary" },
      { label: "透明", value: "transparent" },
    ],
    defaultValue: "default",
    condition: rowVisibilityCondition,
  });

  // 文字颜色（所有类型通用）
  fields.push({
    label: `第 ${rowIndex} 行文字颜色`,
    path: `${rowKey}.textColor`,
    type: "select",
    options: [
      { label: "默认", value: "default" },
      { label: "柔和", value: "muted" },
      { label: "主色", value: "primary" },
      { label: "背景反色", value: "background" },
    ],
    defaultValue: "default",
    condition: rowVisibilityCondition,
  });

  // 水平对齐（文字/图片）
  fields.push({
    label: `第 ${rowIndex} 行水平对齐`,
    path: `${rowKey}.horizontalAlign`,
    type: "select",
    options: [
      { label: "左对齐", value: "left" },
      { label: "居中", value: "center" },
      { label: "右对齐", value: "right" },
    ],
    defaultValue: "left",
    condition: mergeConditions(textTypeCondition, imageTypeCondition),
  });

  // 垂直对齐（文字/图片）
  fields.push({
    label: `第 ${rowIndex} 行垂直对齐`,
    path: `${rowKey}.verticalAlign`,
    type: "select",
    options: [
      { label: "顶部", value: "top" },
      { label: "居中", value: "center" },
      { label: "底部", value: "bottom" },
    ],
    defaultValue: "center",
    condition: mergeConditions(textTypeCondition, imageTypeCondition),
  });

  // 内边距（仅文字）
  fields.push({
    label: `第 ${rowIndex} 行内边距`,
    path: `${rowKey}.padding`,
    type: "select",
    options: [
      { label: "无", value: "none" },
      { label: "小", value: "sm" },
      { label: "中", value: "md" },
      { label: "大", value: "lg" },
      { label: "特大", value: "xl" },
    ],
    defaultValue: "md",
    condition: textTypeCondition,
  });

  // 文字动画（仅文字）
  fields.push({
    label: `第 ${rowIndex} 行文字动画`,
    path: `${rowKey}.textAnimation`,
    type: "select",
    options: [
      { label: "关闭", value: "none" },
      { label: "渐入", value: "fade" },
      { label: "逐行显示", value: "line-reveal" },
      { label: "逐词显示", value: "fade-word" },
      { label: "逐字显示", value: "fade-char" },
    ],
    defaultValue: "line-reveal",
    condition: textTypeCondition,
  });

  // 内容（仅文字）
  fields.push({
    label: `第 ${rowIndex} 行内容`,
    path: `${rowKey}.content`,
    type: "array",
    placeholder: `每行一段内容`,
    helperText: "仅在文字类型下生效",
    condition: textTypeCondition,
  });

  // 背景图片（仅图片）
  fields.push({
    label: `第 ${rowIndex} 行背景图片`,
    path: `${rowKey}.images`,
    type: "imageArray",
    helperText: "仅在图片类型下生效",
    condition: imageTypeCondition,
  });

  // 标题（仅图片）
  fields.push({
    label: `第 ${rowIndex} 行标题`,
    path: `${rowKey}.title`,
    type: "text",
    placeholder: "输入标题",
    helperText: "仅在图片类型下生效",
    condition: imageTypeCondition,
  });

  // 描述（仅图片）
  fields.push({
    label: `第 ${rowIndex} 行描述`,
    path: `${rowKey}.description`,
    type: "text",
    placeholder: "输入描述",
    helperText: "仅在图片类型下生效",
    condition: imageTypeCondition,
  });

  // 跑马灯方向（仅跑马灯）
  fields.push({
    label: `第 ${rowIndex} 行跑马灯方向`,
    path: `${rowKey}.marqueeDirection`,
    type: "select",
    options: [
      { label: "向左", value: "left" },
      { label: "向右", value: "right" },
    ],
    defaultValue: "left",
    condition: marqueeTypeCondition,
  });

  // 跑马灯内容（仅跑马灯）
  fields.push({
    label: `第 ${rowIndex} 行跑马灯内容`,
    path: `${rowKey}.marqueeContent`,
    type: "text",
    placeholder: "输入跑马灯显示的文字",
    helperText: "仅在跑马灯类型下生效",
    condition: marqueeTypeCondition,
  });

  // 跑马灯速度（仅跑马灯）
  fields.push({
    label: `第 ${rowIndex} 行跑马灯速度`,
    path: `${rowKey}.marqueeSpeed`,
    type: "number",
    placeholder: "40",
    helperText: "数值越大滚动越快，建议 20 - 80",
    defaultValue: 40,
    condition: marqueeTypeCondition,
  });

  return fields;
};

// 生成所有行的字段
const rowFields = [
  ...createRowFields(1, "row1"),
  ...createRowFields(2, "row2"),
  ...createRowFields(3, "row3"),
  ...createRowFields(4, "row4"),
  ...createRowFields(5, "row5"),
  ...createRowFields(6, "row6"),
  ...createRowFields(7, "row7"),
  ...createRowFields(8, "row8"),
  ...createRowFields(9, "row9"),
  ...createRowFields(10, "row10"),
  ...createRowFields(11, "row11"),
  ...createRowFields(12, "row12"),
];

export const MULTI_ROW_LAYOUT_FORM_CONFIG: BlockFormConfig = {
  blockType: "multi-row-layout",
  displayName: "多行布局",
  description:
    "通用的底层布局组件，支持1/2/3/4/6/12行配置，每行可设置文字、图片或跑马灯类型。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://neutralpress.net",
  },
  actions: {
    db: 0,
    config: 0,
  },
  fields: [
    {
      label: "行数配置",
      path: "rowCount",
      type: "select",
      options: [
        { label: "1行", value: "1" },
        { label: "2行", value: "2" },
        { label: "3行", value: "3" },
        { label: "4行", value: "4" },
        { label: "6行", value: "6" },
        { label: "12行", value: "12" },
      ],
      defaultValue: "3",
    },
    ...rowFields,
    {
      label: "宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 1,
      helperText: "值越大，桌面端横向面板越宽",
    },
    {
      label: "行间距",
      path: "layout.gap",
      type: "number",
      defaultValue: 0,
      helperText: "行与行之间的间距（像素）",
    },
  ],
  groups: [
    {
      title: "布局配置",
      description: "选择行数、整体宽高比和间距",
      fields: ["rowCount", "layout.ratio", "layout.gap"],
    },
    {
      title: "行内容配置",
      description:
        "先选行类型，再填写对应字段；字段会按行数和类型自动显示，未使用的设置会被隐藏。",
      fields: rowFields.map((field) => field.path),
    },
  ],
  previewData: {
    rowCount: 3,
    row1: {
      type: "marquee",
      marqueeContent: "MULTI-ROW LAYOUT",
      marqueeDirection: "left",
      marqueeSpeed: 40,
      backgroundColor: "primary",
    },
    row2: {
      type: "text",
      content: ["这是一个通用的底层布局组件。", "支持1/2/3/4/6/12行配置。"],
      textAnimation: "fade-word",
      horizontalAlign: "center",
    },
    row3: {
      type: "text",
      content: [
        "每行可设置文字、图片或跑马灯类型。",
        "支持丰富的样式和动画选项。",
      ],
      textAnimation: "line-reveal",
      horizontalAlign: "center",
    },
    layout: {
      ratio: 1,
      gap: 0,
    },
  },
};
