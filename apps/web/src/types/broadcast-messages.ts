/**
 * 广播消息类型定义
 * 用于 use-broadcast hook 的类型安全消息传递
 */

/**
 * MDX 内容渲染相关消息
 */
export interface MDXContentMessage {
  type: "mdx-content-rendered" | "mdx-content-recheck";
}

/**
 * 滚动进度相关消息
 */
export interface ScrollProgressMessage {
  type: "scroll-progress";
  progress: number;
}

/**
 * 所有广播消息的联合类型
 */
export type BroadcastMessage = MDXContentMessage | ScrollProgressMessage;
