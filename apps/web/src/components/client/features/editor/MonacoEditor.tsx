"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";

export interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "markdown" | "mdx" | "html";
  className?: string;
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
}

export function MonacoEditor({
  value,
  onChange,
  language,
  className = "",
  onEditorReady,
}: MonacoEditorProps) {
  const [theme, setTheme] = useState<"vs-light" | "vs-dark">(() => {
    // 初始化时立即检测主题
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      return isDark ? "vs-dark" : "vs-light";
    }
    return "vs-light";
  });

  // 监听主题变化
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const newTheme = isDark ? "vs-dark" : "vs-light";
      setTheme(newTheme);
    };

    // 初始化主题
    updateTheme();

    // 使用 MutationObserver 监听 class 变化
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    // 自动聚焦编辑器
    setTimeout(() => {
      editor.focus();
    }, 100);

    // 调用外部回调
    onEditorReady?.(editor);
  };

  return (
    <div
      className={`monaco-editor-wrapper ${className}`}
      style={{ width: "100%", height: "100%" }}
      data-monaco-editor="true"
    >
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={value}
        theme={theme}
        onChange={(value) => onChange(value || "")}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          lineHeight: 24,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          minimap: {
            enabled: true,
          },
          lineNumbers: "on",
          folding: true,
          wordWrap: "on",
          wrappingIndent: "indent",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          renderLineHighlight: "all",
          bracketPairColorization: {
            enabled: true,
          },
          automaticLayout: true,
          scrollbar: {
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          // 确保编辑器可编辑
          readOnly: false,
          domReadOnly: false,
          // 确保可以接收键盘输入
          contextmenu: true,
          quickSuggestions: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          formatOnPaste: true, // 确保粘贴内容被正确处理
          formatOnType: true, // 自动格式化
          insertSpaces: false, // 保留制表符
          detectIndentation: false, // 禁用自动缩进检测
        }}
      />
    </div>
  );
}
