import type { ReactElement } from "react";
import { render } from "@react-email/render";

/**
 * 将 React Email 组件渲染为 HTML 和纯文本
 * @param component React Email 组件
 * @returns 包含 HTML 和纯文本的对象
 */
export async function renderEmail(component: ReactElement): Promise<{
  html: string;
  text: string;
}> {
  // 渲染 HTML
  const html = await render(component, {
    pretty: true,
  });

  // 渲染纯文本版本
  const text = await render(component, {
    plainText: true,
  });

  return { html, text };
}

/**
 * 将 React Email 组件渲染为 HTML
 * @param component React Email 组件
 * @returns HTML 字符串
 */
export async function renderEmailHtml(
  component: ReactElement,
): Promise<string> {
  return render(component, {
    pretty: true,
  });
}

/**
 * 将 React Email 组件渲染为纯文本
 * @param component React Email 组件
 * @returns 纯文本字符串
 */
export async function renderEmailText(
  component: ReactElement,
): Promise<string> {
  return render(component, {
    plainText: true,
  });
}
