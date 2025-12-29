/**
 * 标题处理工具
 * 统一处理 MDX 和 Markdown 模式下的标题 ID 生成
 */

/**
 * 生成带数字后缀的 slug（避免 CSS 选择器问题）
 * 使用闭包避免全局状态污染
 */
export function createHeadingProcessor() {
  let headingCounter = 0;

  /**
   * 重置标题计数器
   */
  const reset = () => {
    headingCounter = 0;
  };

  /**
   * 生成唯一的标题 slug
   */
  const generateSlug = (text: string): string => {
    headingCounter++;
    const baseSlug = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // 确保 baseSlug 不为空，如果为空使用 'heading'
    const safeBaseSlug = baseSlug || "heading";

    // 将数字放在后缀，避免 CSS 选择器以数字开头的问题
    return `${safeBaseSlug}-${headingCounter}`;
  };

  /**
   * 处理 HTML 字符串中的标题标签，添加 ID 并转换 h1 为 h2
   */
  const processHtmlHeadings = (html: string): string => {
    return html.replace(
      /<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/g,
      (match, level, attrs, content) => {
        // 提取纯文本内容
        const textContent = content.replace(/<[^>]*>/g, "");
        const id = generateSlug(textContent);

        // 将 h1 转换为 h2，其他级别保持不变
        const finalLevel = level === "1" ? "2" : level;

        // 如果已经有 id 属性，只处理标签转换
        if (attrs.includes("id=")) {
          return `<h${finalLevel}${attrs}>${content}</h${finalLevel}>`;
        }

        // 添加 id 并转换标签
        return `<h${finalLevel}${attrs} id="${id}">${content}</h${finalLevel}>`;
      },
    );
  };

  /**
   * 从 HTML 内容中提取目录项
   * 返回包含 id、text、level 的数组
   */
  const extractTocItems = (
    html: string,
  ): Array<{ id: string; text: string; level: number }> => {
    const items: Array<{ id: string; text: string; level: number }> = [];

    // 使用正则提取所有标题
    const headingRegex = /<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/g;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const levelStr = match[1];
      if (!levelStr) continue;

      const level = parseInt(levelStr);
      const content = match[3] || "";

      // 提取纯文本内容（移除 HTML 标签）
      const text = content.replace(/<[^>]*>/g, "");

      // 生成 ID（与 processHtmlHeadings 使用相同逻辑）
      const id = generateSlug(text);

      // 将 h1 当作 h2 处理，其他级别保持不变
      const adjustedLevel = level === 1 ? 2 : level;

      // 将所有目录层级减 1，使层级从 1 开始
      const finalLevel = Math.max(1, adjustedLevel - 1);

      items.push({ id, text, level: finalLevel });
    }

    return items;
  };

  return {
    reset,
    generateSlug,
    processHtmlHeadings,
    extractTocItems,
  };
}
