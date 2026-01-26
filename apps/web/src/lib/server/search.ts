import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * 辅助函数：获取本地日期字符串（YYYY-MM-DD格式）
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 辅助函数：将 Markdown 转换为纯文本
 * 通过遍历 mdast (Markdown AST) 提取文本内容，比 HTML 正则剥离更可靠
 */
export async function markdownToPlainText(markdown: string): Promise<string> {
  // 1. 使用 unified 解析 Markdown
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

  const ast = processor.parse(markdown);

  // 2. 递归提取所有文本节点
  function extractText(node: unknown): string {
    if (!node || typeof node !== "object") return "";

    const nodeObj = node as Record<string, unknown>;
    const type = nodeObj.type as string | undefined;

    // 1. 直接文本节点
    if (type === "text" || type === "inlineCode") {
      // 即使是文本节点，也可能包含未被解析的 HTML 标签（如内联样式），尝试清理
      // 使用更严格的正则：必须以字母或 / 开头，防止误伤 a < b
      const value = nodeObj.value as string | undefined;
      return (value || "").replace(/<[a-zA-Z/][^>]*>/g, " ");
    }

    // 代码块：保留内容，但进行基础清理
    if (type === "code") {
      const value = nodeObj.value as string | undefined;
      return (value || "") + " ";
    }

    // 2. 图片节点 - 提取 alt 文本并添加标识
    if (type === "image" || type === "imageReference") {
      const alt = (nodeObj.alt as string | undefined | null) || "图片";
      return `[${alt}] `;
    }

    // 3. HTML 节点 - 剥离标签保留内容
    if (type === "html") {
      const value = nodeObj.value as string | undefined;
      return (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    }

    // 4. 分割线 - 替换为空格
    if (type === "thematicBreak") {
      return " ";
    }

    // 5. 有子节点的容器节点
    const children = nodeObj.children;
    if (children && Array.isArray(children)) {
      const childrenText = children.map(extractText).join("");

      // 为块级元素添加空格防止粘连
      const blockTypes = [
        "paragraph",
        "heading",
        "listItem",
        "tableCell",
        "tableRow",
        "blockquote",
        "code",
      ];
      if (type && blockTypes.includes(type)) {
        return childrenText + " ";
      }
      return childrenText;
    }

    return "";
  }

  const plainText = extractText(ast);

  // 3. 最终清理：解码实体、移除多余装饰符、合并空格
  return (
    plainText
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // 移除常见的 Markdown 标记符号 (**, __, ~~, `)
      // 匹配成对的或孤立的标记符
      .replace(/(\*\*|__|~~|`)/g, " ")
      // 移除连续的符号行 (---, ***, ===)
      .replace(/[-=*_]{3,}/g, " ")
      // 移除自定义装饰符
      .replace(/\+\+([^+]+)\+\+/g, "$1")
      .replace(/==([^=]+)==/g, "$1")
      // 再次清理可能残留的 HTML 标签 (针对未被解析为 html 节点的漏网之鱼)
      .replace(/<[a-zA-Z/][^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim()
  );
}

/**
 * 智能摘要生成函数
 * 采用聚类拼接策略：
 * 1. 找出所有关键词位置
 * 2. 将邻近的关键词（距离 < 阈值）归为一个片段
 * 3. 拼接这些片段，中间用省略号连接
 * 4. 确保总长度不超过 maxLength
 */
export function generateSmartExcerpt(
  text: string,
  tokens: string[],
  maxLength: number = 80,
): string {
  if (!text || tokens.length === 0) return text.slice(0, maxLength);

  // 1. 找出所有 unique token
  const uniqueTokens = Array.from(
    new Set(tokens.filter((t) => t && t.trim().length > 0)),
  );

  if (uniqueTokens.length === 0) return text.slice(0, maxLength);

  const lowerText = text.toLowerCase();

  // 2. 找出所有 token 在文本中的位置
  const matches: Array<{ start: number; end: number; token: string }> = [];

  for (const token of uniqueTokens) {
    let pos = lowerText.indexOf(token.toLowerCase());
    while (pos !== -1) {
      matches.push({ start: pos, end: pos + token.length, token });
      pos = lowerText.indexOf(token.toLowerCase(), pos + 1);
    }
  }

  if (matches.length === 0) return text.slice(0, maxLength);

  // 按位置排序
  matches.sort((a, b) => a.start - b.start);

  // 3. 初始聚类参数 (非常保守，宁愿碎一点)
  const basePadding = 2; // 初始只留极少上下文
  const mergeDistance = 10; // 两个片段间隔小于此值才合并

  // 4. 生成初始微片段
  // 每个片段结构: { start, end, score, tokens, originalStart, originalEnd }
  // 增加 originalStart/End 以支持 maxContext 限制
  const fragments: Array<{
    start: number;
    end: number;
    score: number;
    tokens: Set<string>;
    originalStart: number;
    originalEnd: number;
  }> = [];

  for (const m of matches) {
    const start = Math.max(0, m.start - basePadding);
    const end = Math.min(text.length, m.end + basePadding);

    if (fragments.length > 0) {
      const last = fragments[fragments.length - 1];
      // 检查是否重叠或极近
      if (last && start <= last.end + mergeDistance) {
        last.end = Math.max(last.end, end);
        // 更新 originalEnd 为最新的 match end (近似处理，取并集的最远端)
        if (last.originalEnd !== undefined) {
          last.originalEnd = Math.max(last.originalEnd, m.end);
        }
        last.score += m.token.length;
        last.tokens.add(m.token);
        continue;
      }
    }

    fragments.push({
      start,
      end,
      score: m.token.length,
      tokens: new Set([m.token]),
      originalStart: m.start,
      originalEnd: m.end,
    });
  }

  // 5. 筛选片段以适应 maxLength 和可见性要求
  // 省略号长度估计为 3 ("...")
  const ellipsisLen = 3;
  const visibleThreshold = 40; // 前40个字符为可见区域

  // 5.1 首先检查：如果存在多个片段，且后面的片段会在可见区域外被截断
  // 则删除前面的某些片段，让后面的关键词前移到可见区域内

  while (fragments.length > 1) {
    // 计算当前所有片段的总长度
    const currentTotalLen =
      fragments.reduce((sum, f) => sum + (f.end - f.start), 0) +
      (fragments.length - 1) * ellipsisLen;

    // 如果总长度已经在 maxLength 内，检查可见性
    if (currentTotalLen <= maxLength) {
      // 计算第二个关键词的位置（如果有的话）
      if (fragments.length >= 2) {
        const firstFrag = fragments[0];
        const secondFrag = fragments[1];

        if (firstFrag && secondFrag) {
          // 第二个关键词在完整摘要中的位置 = 第一个片段长度 + 省略号
          const secondKeywordPos =
            firstFrag.end - firstFrag.start + ellipsisLen;

          // 如果第二个关键词在可见区域外（超过40字符），删除第一个片段
          if (secondKeywordPos > visibleThreshold) {
            fragments.shift(); // 删除第一个片段
            continue; // 重新检查
          }
        }
      }
      break; // 长度和可见性都满足
    }

    // 如果总长度超出 maxLength，需要删除片段
    // 统计全局 token 覆盖情况
    const allTokens = new Set<string>();
    fragments.forEach((f) => f.tokens.forEach((t) => allTokens.add(t)));

    let worstIndex = -1;
    let minUniqueContribution = Infinity;

    for (let i = fragments.length - 1; i >= 0; i--) {
      // 从后往前找，倾向于删除后面的
      const frag = fragments[i];
      if (!frag) continue;

      // 计算如果删除这个片段，会丢失多少种 token
      // 即：这个片段有的 token，其他片段都没有
      let contribution = 0;
      frag.tokens.forEach((t) => {
        let existsInOthers = false;
        for (let j = 0; j < fragments.length; j++) {
          const otherFrag = fragments[j];
          if (i !== j && otherFrag && otherFrag.tokens.has(t)) {
            existsInOthers = true;
            break;
          }
        }
        if (!existsInOthers) contribution++;
      });

      if (contribution < minUniqueContribution) {
        minUniqueContribution = contribution;
        worstIndex = i;
      }
    }

    if (worstIndex !== -1) {
      // 删除该片段
      const removed = fragments.splice(worstIndex, 1)[0];
      if (removed) {
        // 继续循环，重新计算
      }
    } else {
      break; // 应该不会发生
    }
  }

  // 重新计算总长度
  let currentTotalLen =
    fragments.reduce((sum, f) => sum + (f.end - f.start), 0) +
    (fragments.length - 1) * ellipsisLen;

  // 6. 动态扩展 (核心优化)
  // 如果还有空间，轮流向外扩展上下文，但增加最大上下文限制，避免过度填充
  const maxContext = 15; // 每个方向最大扩展字符数

  // 辅助函数：获取第 i 个片段允许的左边界
  const getMinStart = (i: number) => {
    const frag = fragments[i];
    if (!frag) return 0;
    // 绝对左边界：基于原始匹配位置向左 maxContext
    const limit = Math.max(0, frag.originalStart - maxContext);
    // 相对左边界（不能越过上一个片段）
    const neighbor = i === 0 ? 0 : (fragments[i - 1]?.end ?? 0);
    return Math.max(limit, neighbor);
  };

  // 辅助函数：获取第 i 个片段允许的右边界
  const getMaxEnd = (i: number) => {
    const frag = fragments[i];
    if (!frag) return text.length;
    // 绝对右边界
    const limit = Math.min(text.length, frag.originalEnd + maxContext);
    // 相对右边界
    const neighbor =
      i === fragments.length - 1
        ? text.length
        : (fragments[i + 1]?.start ?? text.length);
    return Math.min(limit, neighbor);
  };

  let changed = true;
  while (currentTotalLen < maxLength && changed) {
    changed = false;

    for (let i = 0; i < fragments.length; i++) {
      if (currentTotalLen >= maxLength) break;

      const frag = fragments[i];
      if (!frag) continue;

      const minStart = getMinStart(i);
      const maxEnd = getMaxEnd(i);

      // 尝试向左扩展
      if (frag.start > minStart) {
        const step = Math.min(2, maxLength - currentTotalLen);
        const actualMove = Math.min(frag.start - minStart, step);
        if (actualMove > 0) {
          frag.start -= actualMove;
          currentTotalLen += actualMove;
          changed = true;
        }
      }

      if (currentTotalLen >= maxLength) break;

      // 尝试向右扩展
      if (frag.end < maxEnd) {
        const step = Math.min(2, maxLength - currentTotalLen);
        const actualMove = Math.min(maxEnd - frag.end, step);
        if (actualMove > 0) {
          frag.end += actualMove;
          currentTotalLen += actualMove;
          changed = true;
        }
      }
    }
  }

  // 6.5 如果仍然不足 maxLength，从最后一个片段向后扩充到文本末尾
  if (currentTotalLen < maxLength && fragments.length > 0) {
    const lastFrag = fragments[fragments.length - 1];
    if (lastFrag && lastFrag.end < text.length) {
      const remaining = maxLength - currentTotalLen;
      const extension = Math.min(remaining, text.length - lastFrag.end);
      lastFrag.end += extension;
      currentTotalLen += extension;
    }
  }

  // 7. 拼接输出

  let resultHtml = "";

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    if (!frag) continue;

    let content = text.slice(frag.start, frag.end);

    // HTML 转义
    content = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // 高亮
    const sortedTokens = [...uniqueTokens].sort((a, b) => b.length - a.length);
    const pattern = sortedTokens
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    if (pattern) {
      const regex = new RegExp(`(${pattern})`, "gi");
      content = content.replace(regex, "<mark>$1</mark>");
    }

    // 前导省略号
    if (i === 0 && frag.start > 0) {
      resultHtml += "...";
    } else if (i > 0) {
      resultHtml += "..."; // 片段间
    }

    resultHtml += content;

    // 尾部省略号
    if (i === fragments.length - 1 && frag.end < text.length) {
      resultHtml += "...";
    }
  }

  return resultHtml;
}

/**
 * 标题高亮函数
 * 直接在标题中查找所有关键词并高亮
 */
export function highlightTitle(title: string, tokens: string[]): string {
  if (!title || tokens.length === 0) return title;

  // 找出所有 unique token
  const uniqueTokens = Array.from(
    new Set(tokens.filter((t) => t && t.trim().length > 0)),
  );

  if (uniqueTokens.length === 0) return title;

  // HTML 转义
  let escaped = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 按长度降序排序，避免短 token 破坏长 token 的匹配
  const sortedTokens = [...uniqueTokens].sort((a, b) => b.length - a.length);

  // 为每个 token 创建正则，并高亮
  for (const token of sortedTokens) {
    const pattern = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${pattern})`, "gi");
    escaped = escaped.replace(regex, "<mark>$1</mark>");
  }

  return escaped;
}
