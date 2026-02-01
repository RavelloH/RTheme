"use client";

import { useEffect, useRef } from "react";
import type { JSONContent } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import InvisibleCharacters from "@tiptap/extension-invisible-characters";
import Link from "@tiptap/extension-link";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { BundledTheme } from "shiki";
import CodeBlockShiki from "tiptap-extension-code-block-shiki";

import { TableOfContents } from "@/components/client/features/editor/TableOfContents";
import { useConfig } from "@/context/ConfigContext";
import {
  type EditorConfig,
  saveEditorContent,
} from "@/lib/client/editor-persistence";
import { CustomHeading } from "@/lib/tiptap/custom-heading";
import { CustomParagraph } from "@/lib/tiptap/custom-paragraph";
import {
  HighlightWithMarkdown,
  SubscriptWithMarkdown,
  SuperscriptWithMarkdown,
  TextAlignWithMarkdown,
  UnderlineWithMarkdown,
} from "@/lib/tiptap/markdown-extensions";
import {
  TableCellWithMarkdown,
  TableHeaderWithMarkdown,
  TableRowWithMarkdown,
  TableWithMarkdown,
} from "@/lib/tiptap/table-with-markdown";
import type { ConfigType } from "@/types/config";

// 解析 Markdown 表格中的对齐标记
function parseTableAlignment(markdown: string): Map<number, string[]> {
  const tableAlignments = new Map<number, string[]>();
  const lines = markdown.split("\n");
  let tableIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const trimmedLine = line.trim();

    // 检测表格分隔行（包含对齐标记）
    if (trimmedLine.startsWith("|") && trimmedLine.includes("-")) {
      const cells = trimmedLine
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());

      // 检查是否为分隔行
      const isSeparator = cells.every((cell) =>
        /^:?-+:?$/.test(cell.replace(/\s/g, "")),
      );

      if (isSeparator) {
        const alignments = cells.map((cell) => {
          const trimmed = cell.trim();
          if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
            return "center";
          } else if (trimmed.endsWith(":")) {
            return "right";
          } else {
            return null; // left 或无对齐
          }
        });

        tableAlignments.set(tableIndex, alignments as string[]);
        tableIndex++;
      }
    }
  }

  return tableAlignments;
}

// 后处理 JSON 内容，添加表格对齐信息
function postProcessTableAlignment(
  json: JSONContent,
  markdown: string,
): JSONContent {
  const tableAlignments = parseTableAlignment(markdown);
  let tableIndex = 0;

  function processNode(node: JSONContent): JSONContent {
    if (node.type === "table") {
      const alignments = tableAlignments.get(tableIndex);
      tableIndex++;

      if (alignments && node.content) {
        // 为每一行的单元格添加对齐信息
        const processedContent = node.content.map((row) => {
          if (row.type === "tableRow" && row.content) {
            const processedCells = row.content.map((cell, cellIndex) => {
              const align = alignments[cellIndex];
              return {
                ...cell,
                attrs: {
                  ...cell.attrs,
                  textAlign: align || null,
                },
              };
            });

            return {
              ...row,
              content: processedCells,
            };
          }
          return row;
        });

        return {
          ...node,
          content: processedContent,
        };
      }
    }

    // 递归处理子节点
    if (node.content) {
      return {
        ...node,
        content: node.content.map(processNode),
      };
    }

    return node;
  }

  return processNode(json);
}

// Toast 实例（需要从外部传入）
let toastInstance: {
  info: (title: string, message?: string, duration?: number) => string;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  update: (
    id: string,
    title: string,
    message?: string,
    type?: "success" | "error" | "warning" | "info",
    progress?: number,
  ) => void;
} | null = null;

// 存储当前上传的 Toast ID（用于主动关闭）
let currentUploadToastId: string | null = null;

// 设置 Toast 实例
export function setEditorToast(toast: typeof toastInstance): void {
  toastInstance = toast;
}

// 上传图片到服务器的辅助函数
async function uploadImageToServer(
  file: File,
  view: EditorView,
  localImageUrl: string,
): Promise<void> {
  // 显示上传中的 Toast（不自动关闭）
  // 格式：上方显示状态，下方显示文件名
  currentUploadToastId =
    toastInstance?.info("正在上传图片", file.name, 0) || null;

  // 用于节流进度更新，避免频繁更新 Toast
  let lastProgressUpdate = 0;
  const PROGRESS_UPDATE_INTERVAL = 100; // 100ms 更新一次

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", "lossy"); // 默认使用有损压缩

    // 使用 XMLHttpRequest 以支持进度追踪
    const xhr = new XMLHttpRequest();

    // 创建 Promise 包装 XHR
    const uploadPromise = new Promise<{
      success: boolean;
      data?: { imageId: string; originalName: string };
      message?: string;
    }>((resolve, reject) => {
      // 上传进度
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && currentUploadToastId) {
          const now = Date.now();
          // 节流：每 100ms 更新一次，避免过于频繁
          if (now - lastProgressUpdate < PROGRESS_UPDATE_INTERVAL) {
            return;
          }
          lastProgressUpdate = now;

          const progress = Math.round((e.loaded / e.total) * 100);
          // 使用 update 方法更新 Toast 内容，传递进度参数
          if (toastInstance && currentUploadToastId) {
            toastInstance.update(
              currentUploadToastId,
              "正在上传图片",
              file.name,
              undefined, // 不改变类型
              progress, // 传递进度
            );
          }
        }
      });

      // 请求完成
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            reject(new Error("解析响应失败"));
          }
        } else {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            reject(new Error(`上传失败: ${xhr.statusText}`));
          }
        }
      });

      // 请求错误
      xhr.addEventListener("error", () => {
        reject(new Error("网络错误"));
      });

      // 发送请求
      xhr.open("POST", "/admin/media/upload");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.withCredentials = true;
      xhr.send(formData);
    });

    const result = await uploadPromise;

    if (result.success && result.data) {
      // 上传成功，先预加载图片再替换
      const imageUrl = `/p/${result.data.imageId}`;

      // 创建一个新的 Image 对象来预加载图片
      const preloadImg = new window.Image();

      preloadImg.onload = () => {
        // 图片加载完成，现在替换本地图片为真实图片
        // 获取最新的编辑器状态
        const state = view.state;
        const { schema, doc } = state;

        // 遍历文档，查找包含 blob URL 的图片节点
        let foundPos: number | null = null;
        let foundNodeSize: number | null = null;

        doc.descendants((node, pos) => {
          if (
            node.type === schema.nodes.image &&
            node.attrs.src === localImageUrl
          ) {
            foundPos = pos;
            foundNodeSize = node.nodeSize;
            return false; // 停止遍历
          }
        });

        if (foundPos !== null && foundNodeSize !== null) {
          // 创建新的图片节点（使用真实 URL）
          if (schema.nodes.image) {
            const newImageNode = schema.nodes.image.create({
              src: imageUrl,
              alt: result.data?.originalName || file.name,
            });

            // 创建新的事务，替换整个节点
            const tr = state.tr.replaceRangeWith(
              foundPos,
              foundPos + foundNodeSize,
              newImageNode,
            );

            view.dispatch(tr);
          }
        }

        // 更新 Toast 为成功状态（移除进度）
        if (currentUploadToastId && toastInstance) {
          toastInstance.update(
            currentUploadToastId,
            "图片上传成功",
            file.name,
            "success",
            undefined, // 移除进度条
          );

          // 2秒后自动关闭
          setTimeout(() => {
            if (currentUploadToastId) {
              toastInstance?.dismiss(currentUploadToastId);
              currentUploadToastId = null;
            }
          }, 2000);
        }

        // 释放本地 URL
        URL.revokeObjectURL(localImageUrl);
      };

      preloadImg.onerror = () => {
        // 图片预加载失败
        console.error("图片预加载失败:", imageUrl);

        // 更新 Toast 为错误状态（移除进度）
        if (currentUploadToastId && toastInstance) {
          toastInstance.update(
            currentUploadToastId,
            "图片加载失败",
            file.name,
            "error",
            undefined, // 移除进度条
          );

          // 5秒后自动关闭
          setTimeout(() => {
            if (currentUploadToastId) {
              toastInstance?.dismiss(currentUploadToastId);
              currentUploadToastId = null;
            }
          }, 5000);
        }

        // 不删除图片节点，保留 blob URL 以便用户可以看到
      };

      // 开始预加载图片
      preloadImg.src = imageUrl;
    } else {
      // 上传失败，删除图片
      console.error("图片上传失败:", result.message);

      // 获取最新状态并查找图片节点
      const state = view.state;
      const { schema, doc } = state;

      let foundPos: number | null = null;
      let foundNodeSize: number | null = null;

      doc.descendants((node, pos) => {
        if (
          node.type === schema.nodes.image &&
          node.attrs.src === localImageUrl
        ) {
          foundPos = pos;
          foundNodeSize = node.nodeSize;
          return false;
        }
      });

      if (foundPos !== null && foundNodeSize !== null) {
        const tr = state.tr.delete(foundPos, foundPos + foundNodeSize);
        view.dispatch(tr);
      }

      // 更新 Toast 为错误状态（移除进度）
      if (currentUploadToastId && toastInstance) {
        toastInstance.update(
          currentUploadToastId,
          "图片上传失败",
          file.name,
          "error",
          undefined, // 移除进度条
        );

        // 3秒后自动关闭
        setTimeout(() => {
          if (currentUploadToastId) {
            toastInstance?.dismiss(currentUploadToastId);
            currentUploadToastId = null;
          }
        }, 3000);
      }

      // 释放本地 URL
      URL.revokeObjectURL(localImageUrl);
    }
  } catch (error) {
    console.error("图片上传失败:", error);

    // 上传出错，删除图片
    const state = view.state;
    const { schema, doc } = state;

    let foundPos: number | null = null;
    let foundNodeSize: number | null = null;

    doc.descendants((node, pos) => {
      if (
        node.type === schema.nodes.image &&
        node.attrs.src === localImageUrl
      ) {
        foundPos = pos;
        foundNodeSize = node.nodeSize;
        return false;
      }
    });

    if (foundPos !== null && foundNodeSize !== null) {
      const tr = state.tr.delete(foundPos, foundPos + foundNodeSize);
      view.dispatch(tr);
    }

    // 更新 Toast 为错误状态（移除进度）
    if (currentUploadToastId && toastInstance) {
      toastInstance.update(
        currentUploadToastId,
        "图片上传失败",
        file.name,
        "error",
        undefined, // 移除进度条
      );

      // 3秒后自动关闭
      setTimeout(() => {
        if (currentUploadToastId) {
          toastInstance?.dismiss(currentUploadToastId);
          currentUploadToastId = null;
        }
      }, 3000);
    }

    // 释放本地 URL
    URL.revokeObjectURL(localImageUrl);
  }
}

// 自定义扩展：粘贴和拖拽图片自动上传
const PasteImageUpload = Extension.create({
  name: "pasteImageUpload",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pasteImageUpload"),
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;

            // 检查剪贴板中是否有图片
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item && item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (!file) continue;

                // 阻止默认粘贴行为
                event.preventDefault();

                // 创建本地 blob URL
                const localImageUrl = URL.createObjectURL(file);

                // 立即插入本地图片
                const { schema } = view.state;
                const node = schema.nodes.image?.create({
                  src: localImageUrl,
                  alt: file.name,
                });

                if (node) {
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);

                  // 上传图片，传入本地 URL（不再需要位置参数）
                  uploadImageToServer(file, view, localImageUrl);
                }

                return true;
              }
            }

            return false;
          },
          handleDrop: (view, event) => {
            const hasFiles =
              event.dataTransfer &&
              event.dataTransfer.files &&
              event.dataTransfer.files.length > 0;

            if (!hasFiles) return false;

            const files = Array.from(event.dataTransfer.files);
            const imageFiles = files.filter((file) =>
              file.type.startsWith("image/"),
            );

            // 如果没有图片文件，不处理
            if (imageFiles.length === 0) return false;

            // 阻止默认拖拽行为
            event.preventDefault();

            // 获取拖拽位置
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });

            if (!coordinates) return false;

            // 处理所有图片文件
            imageFiles.forEach((file) => {
              // 创建本地 blob URL
              const localImageUrl = URL.createObjectURL(file);

              // 立即在拖拽位置插入本地图片
              const { schema } = view.state;
              const node = schema.nodes.image?.create({
                src: localImageUrl,
                alt: file.name,
              });

              if (node) {
                // 在拖拽位置插入图片
                const transaction = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(transaction);

                // 上传图片，传入本地 URL
                uploadImageToServer(file, view, localImageUrl);
              }
            });

            return true;
          },
        },
      }),
    ];
  },
});

// 自定义扩展：确保文档末尾始终有一个空段落
const TrailingParagraph = Extension.create({
  name: "trailingParagraph",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("trailingParagraph"),
        appendTransaction: (transactions, oldState, newState) => {
          // 只在文档内容发生变化时检查
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          const { doc, schema, tr } = newState;
          const lastNode = doc.lastChild;

          // 如果最后一个节点不是段落，或者是非空段落，添加一个空段落
          if (
            !lastNode ||
            lastNode.type !== schema.nodes.paragraph ||
            lastNode.content.size > 0
          ) {
            if (schema.nodes.paragraph) {
              const paragraph = schema.nodes.paragraph.create();
              tr.insert(doc.content.size, paragraph);
              return tr;
            }
          }

          return null;
        },
      }),
    ];
  },
});

// 自定义扩展：双击空格退出链接
const ExitLinkOnDoubleSpace = Extension.create({
  name: "exitLinkOnDoubleSpace",

  addKeyboardShortcuts() {
    let lastSpaceTime = 0;
    const doubleClickThreshold = 300; // 300ms 内连续两次空格视为双击

    return {
      Space: ({ editor }: { editor: Editor }) => {
        const now = Date.now();

        // 检查是否在链接内
        if (editor.isActive("link")) {
          // 检查是否是双击空格
          if (now - lastSpaceTime < doubleClickThreshold) {
            // 双击空格，退出链接编辑模式
            const { from } = editor.state.selection;

            // 找到空格字符的位置范围
            const spaceFrom = from - 1;
            const spaceTo = from;

            editor
              .chain()
              .focus()
              .command(({ tr, dispatch, state }) => {
                if (dispatch) {
                  const linkType = state.schema.marks.link;

                  // 方法：移除刚插入的空格上的链接标记
                  if (linkType) {
                    // 遍历空格位置的 marks，移除链接 mark
                    tr.removeMark(spaceFrom, spaceTo, linkType);

                    // 清除存储的链接标记，确保后续输入不继承
                    tr.removeStoredMark(linkType);
                  }
                }
                return true;
              })
              .run();

            lastSpaceTime = 0; // 重置
            return true;
          }

          lastSpaceTime = now;
        } else {
          lastSpaceTime = 0;
        }

        return false; // 让默认的空格行为继续
      },
    };
  },
});

export interface TiptapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
  className?: string;
  showInvisibleChars?: boolean;
  enablePersistence?: boolean; // 是否启用持久化
  editorConfig?: EditorConfig; // 编辑器配置
  storageKey?: string; // localStorage 键名
  showTableOfContents?: boolean; // 是否显示目录
  onMathClick?: (
    latex: string,
    type: "inline" | "block",
    position: number,
  ) => void; // 数学公式点击回调
}

export function TiptapEditor({
  content = "",
  onChange,
  placeholder = "开始编写内容...",
  onEditorReady,
  className = "",
  showInvisibleChars = false,
  enablePersistence = false,
  editorConfig = {},
  storageKey = "new",
  showTableOfContents = false,
  onMathClick,
}: TiptapEditorProps) {
  const shikiTheme = useConfig(
    "site.shiki.theme",
  ) as ConfigType<"site.shiki.theme">;

  // 用于跟踪是否是首次渲染，避免初始化时触发保存
  const isFirstRender = useRef(true);

  // 规范化初始内容：将 3 个或更多连续换行符替换为 2 个
  const normalizedInitialContent = content.replace(/\n{3,}/g, "\n\n");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
        link: false,
        underline: false,
      }),
      CustomHeading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      CustomParagraph,
      CodeBlockShiki.configure({
        defaultTheme: shikiTheme.dark as BundledTheme,
        themes: {
          light: shikiTheme.light as BundledTheme,
          dark: shikiTheme.dark as BundledTheme,
        },
        defaultLanguage: null,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-text",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      TableWithMarkdown.configure({
        resizable: false,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full",
        },
      }),
      TableRowWithMarkdown,
      TableCellWithMarkdown.configure({
        HTMLAttributes: {
          class: "border border-foreground/20 px-3 py-2",
        },
      }),
      TableHeaderWithMarkdown.configure({
        HTMLAttributes: {
          class:
            "border border-foreground/20 px-3 py-2 font-bold bg-foreground/5",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0 my-0 py-0",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      UnderlineWithMarkdown,
      HighlightWithMarkdown.configure({
        multicolor: false,
        HTMLAttributes: {
          class: "bg-yellow-200 dark:bg-yellow-800 px-1 rounded",
        },
      }),
      SuperscriptWithMarkdown,
      SubscriptWithMarkdown,
      Placeholder.configure({
        placeholder,
      }),
      InvisibleCharacters,
      TextAlignWithMarkdown.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
      CharacterCount,
      // 分别配置 InlineMath 和 BlockMath
      InlineMath.configure({
        katexOptions: {
          throwOnError: false,
          strict: false,
          displayMode: false, // 行内公式使用 inline mode
        },
        onClick: (node, pos) => {
          if (onMathClick) {
            onMathClick(node.attrs.latex, "inline", pos);
          }
        },
      }),
      BlockMath.configure({
        katexOptions: {
          throwOnError: false,
          strict: false,
          displayMode: true, // 块级公式使用 display mode
        },
        onClick: (node, pos) => {
          if (onMathClick) {
            onMathClick(node.attrs.latex, "block", pos);
          }
        },
      }),
      Markdown,
      TrailingParagraph, // 确保末尾始终有空段落
      ExitLinkOnDoubleSpace,
      PasteImageUpload,
    ],
    content: normalizedInitialContent,
    editorProps: {
      attributes: {
        class: "tiptap min-h-full text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      // 直接使用 Tiptap Markdown 扩展导出 Markdown
      let markdown = editor.getMarkdown();

      // 规范化 Markdown：将 3 个或更多连续换行符替换为 2 个
      markdown = markdown.replace(/\n{3,}/g, "\n\n");

      console.log("Tiptap导出的markdown", markdown);

      // 调用外部onChange回调
      onChange?.(markdown);

      // 如果启用了持久化,保存到localStorage
      // 跳过首次渲染时的保存，避免覆盖刚加载的草稿
      if (enablePersistence && !isFirstRender.current) {
        saveEditorContent(markdown, editorConfig, true, storageKey); // isMarkdown = true
      }

      // 标记首次渲染已完成
      if (isFirstRender.current) {
        isFirstRender.current = false;
      }
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // 监听 content prop 的变化，当从其他编辑器切换回来时更新内容
  useEffect(() => {
    if (!editor || !content) return;

    // 规范化输入的 Markdown：将 3 个或更多连续换行符替换为 2 个
    const normalizedContent = content.replace(/\n{3,}/g, "\n\n");

    // 检查当前内容是否与传入的 content 不同
    // 使用 markdown.parse 将 Markdown 转换为 JSON
    // @ts-expect-error - markdown.parse方法可能没有类型定义
    let json = editor.markdown.parse(normalizedContent);

    // 后处理：为表格单元格添加对齐信息
    json = postProcessTableAlignment(json, normalizedContent);

    const currentJson = editor.getJSON();

    // 简单比较：如果内容不同，则更新
    if (JSON.stringify(json) !== JSON.stringify(currentJson)) {
      editor.commands.setContent(json);
    }
  }, [editor, content]);

  // 根据 showInvisibleChars 状态控制不可见字符的显示
  useEffect(() => {
    if (!editor) return;

    if (showInvisibleChars) {
      editor.commands.showInvisibleCharacters();
    } else {
      editor.commands.hideInvisibleCharacters();
    }
  }, [editor, showInvisibleChars]);

  // 阻止链接的默认点击行为
  useEffect(() => {
    if (!editor) return;

    const preventLinkNavigation = (event: Event) => {
      const target = event.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.hasAttribute("href")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };

    // 获取编辑器的 DOM 元素
    const editorElement = editor.view.dom;

    // 监听多个事件以确保完全阻止跳转
    editorElement.addEventListener("click", preventLinkNavigation, true);
    editorElement.addEventListener("mousedown", preventLinkNavigation, true);
    editorElement.addEventListener("mouseup", preventLinkNavigation, true);

    return () => {
      editorElement.removeEventListener("click", preventLinkNavigation, true);
      editorElement.removeEventListener(
        "mousedown",
        preventLinkNavigation,
        true,
      );
      editorElement.removeEventListener("mouseup", preventLinkNavigation, true);
    };
  }, [editor]);

  return (
    <div className={`tiptap-editor w-full h-full ${className}`}>
      <div className="h-full overflow-auto" id="tiptap-scroll-container">
        <div
          className={`flex gap-6 ${showTableOfContents ? "max-w-7xl" : "max-w-4xl"} mx-auto px-6 py-8 transition-all duration-300`}
        >
          {/* 主编辑区 - 自适应剩余空间 */}
          <div className="flex-1 min-w-0 transition-all duration-300">
            <EditorContent editor={editor} className="h-full" />
          </div>

          {/* 目录区域 - 固定宽度 w-64 */}
          <div
            className={`hidden xl:block sticky top-8 self-start max-h-[calc(100vh-8rem)] transition-all duration-300 overflow-hidden shrink-0 ${
              showTableOfContents ? "w-64 opacity-100" : "w-0 opacity-0"
            }`}
          >
            <TableOfContents editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
