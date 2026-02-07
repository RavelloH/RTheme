import type { BlockFormConfig } from "@/blocks/core/types/field-config";

// 特殊占位符：用于条件检查中标识"字段必须存在且有值"
// 见 BlockConfigPanel.tsx 中的 checkFieldCondition 函数
const FIELD_REQUIRED = "@@_MISSING_FIELD_@@";

// 生成选项卡字段的辅助函数
const createTabFields = (index: number, prevIndex: number) => {
  const labelField = {
    label: `选项卡 ${index} 标签`,
    path: `no${index}.label`,
    type: "text" as const,
    placeholder: `输入第 ${index} 个选项卡的标签`,
  };

  const contentField = {
    label: `选项卡 ${index} 内容`,
    path: `no${index}.content`,
    type: "array" as const,
    placeholder: `输入第 ${index} 个选项卡的内容（每行一段）`,
  };

  // 第一项始终显示，后续项需前一项的 label 存在且有值
  if (index > 1) {
    // 使用 not 条件配合特殊占位符：
    // 当 cond.value === FIELD_REQUIRED 时，检查字段必须存在且有非空值
    const condition = {
      not: [{ field: `no${prevIndex}.label`, value: FIELD_REQUIRED }],
    };
    return [
      { ...labelField, condition },
      { ...contentField, condition },
    ];
  }

  return [labelField, contentField];
};

// 生成所有 10 个选项卡字段
const tabFields = [
  ...createTabFields(1, 0),
  ...createTabFields(2, 1),
  ...createTabFields(3, 2),
  ...createTabFields(4, 3),
  ...createTabFields(5, 4),
  ...createTabFields(6, 5),
  ...createTabFields(7, 6),
  ...createTabFields(8, 7),
  ...createTabFields(9, 8),
  ...createTabFields(10, 9),
];

export const TABS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "tabs",
  displayName: "选项卡区块",
  description: "选项卡面板，用于组织和切换不同内容区域。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://docs.ravelloh.com",
  },
  actions: {
    db: 0,
    config: 0,
  },
  fields: [
    ...tabFields,
    {
      label: "标签位置",
      path: "layout.tabPosition",
      type: "select",
      options: [
        { label: "顶部", value: "top" },
        { label: "左侧", value: "left" },
      ],
      defaultValue: "top",
    },
    {
      label: "样式",
      path: "layout.style",
      type: "select",
      options: [
        { label: "下划线", value: "underline" },
        { label: "胶囊", value: "pills" },
        { label: "边框", value: "bordered" },
      ],
      defaultValue: "underline",
    },
    {
      label: "宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 1,
    },
    {
      label: "标签栏居中",
      path: "layout.tabsCentered",
      type: "toggle",
      defaultValue: false,
    },
    {
      label: "内容水平对齐",
      path: "layout.contentAlign",
      type: "select",
      options: [
        { label: "左对齐", value: "left" },
        { label: "居中", value: "center" },
        { label: "右对齐", value: "right" },
      ],
      defaultValue: "left",
    },
    {
      label: "内容垂直对齐",
      path: "layout.contentVerticalAlign",
      type: "select",
      options: [
        { label: "顶部", value: "top" },
        { label: "居中", value: "center" },
        { label: "底部", value: "bottom" },
      ],
      defaultValue: "top",
    },
  ],
  groups: [
    {
      title: "选项卡内容",
      description: "添加最多 10 个选项卡，只有填写前一个选项卡后才会显示下一个",
      fields: tabFields.map((f) => f.path),
    },
    {
      title: "布局",
      description: "控制选项卡的外观和位置",
      fields: [
        "layout.tabPosition",
        "layout.style",
        "layout.ratio",
        "layout.tabsCentered",
        "layout.contentAlign",
        "layout.contentVerticalAlign",
      ],
    },
  ],
  previewData: {
    no1: {
      label: "简介",
      content: ["这是第一个选项卡的内容。", "可以包含多行文字。"],
    },
    no2: {
      label: "特性",
      content: ["特性一：简洁高效", "特性二：功能强大", "特性三：易于使用"],
    },
    no3: {
      label: "更多",
      content: [
        "更多内容可以在这里展示。",
        "添加更多选项卡以丰富信息。",
        "最多支持 10 个选项卡。",
        "使用 **Markdown** 来格式化文本或添加[链接](https://ravelloh.com)。",
      ],
    },
    layout: {
      tabPosition: "top",
      style: "underline",
      ratio: 1,
      tabsCentered: true,
      contentAlign: "center",
      contentVerticalAlign: "center",
    },
  },
};
