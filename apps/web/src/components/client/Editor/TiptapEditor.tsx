"use client";

import { useEditor, EditorContent, Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Placeholder from "@tiptap/extension-placeholder";
import InvisibleCharacters from "@tiptap/extension-invisible-characters";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import { Markdown } from "@tiptap/markdown";
import { useEffect, useRef } from "react";
import {
  saveEditorContent,
  type EditorConfig,
} from "@/lib/client/editorPersistence";
import CodeBlockShiki from "tiptap-extension-code-block-shiki";

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
}: TiptapEditorProps) {
  // 用于跟踪是否是首次渲染，避免初始化时触发保存
  const isFirstRender = useRef(true);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        link: false,
      }),
      CodeBlockShiki.configure({
        defaultTheme: "light-plus",
        themes: {
          light: "light-plus",
          dark: "dark-plus",
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
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full",
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-foreground/20 px-3 py-2",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class:
            "border border-foreground/20 px-3 py-2 font-bold bg-foreground/5",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class: "bg-yellow-200 dark:bg-yellow-800 px-1 rounded",
        },
      }),
      Superscript,
      Subscript,
      Placeholder.configure({
        placeholder,
      }),
      InvisibleCharacters,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
      CharacterCount,
      Markdown,
      ExitLinkOnDoubleSpace,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-base sm:prose-lg lg:prose-xl max-w-none focus:outline-none min-h-full text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

      console.log(html);

      // 调用外部onChange回调
      onChange?.(html);

      // 如果启用了持久化,保存到localStorage
      // 跳过首次渲染时的保存，避免覆盖刚加载的草稿
      if (enablePersistence && !isFirstRender.current) {
        saveEditorContent(html, editorConfig, false, storageKey);
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

    // 检查当前内容是否与传入的 content 不同
    // 使用 markdown.parse 将 Markdown 转换为 JSON
    // @ts-expect-error - markdown.parse方法可能没有类型定义
    const json = editor.markdown.parse(content);
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
      <div className="h-full overflow-auto flex justify-center">
        <div className="w-full max-w-4xl px-6 py-8">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  );
}
