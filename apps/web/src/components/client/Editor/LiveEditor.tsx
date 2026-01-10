"use client";

import { useRef, useEffect } from "react";
import { MonacoEditor } from "./MonacoEditor";
import { LivePreview } from "./LivePreview";
import type { editor } from "monaco-editor";

export interface LiveEditorProps {
  content: string;
  onChange: (content: string) => void;
  mode: "markdown" | "mdx";
  className?: string;
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
}

export function LiveEditor({
  content,
  onChange,
  mode,
  className = "",
  onEditorReady,
}: LiveEditorProps) {
  const monacoContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorReady = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    onEditorReady?.(editor);
  };

  // Monaco 滚动时同步预览区域
  useEffect(() => {
    const editor = editorRef.current;
    const previewContainer = previewContainerRef.current?.querySelector(
      ".md-content",
    ) as HTMLDivElement;

    if (!editor || !previewContainer) return;

    const handleMonacoScroll = () => {
      const scrollTop = editor.getScrollTop();
      const scrollHeight = editor.getScrollHeight();
      const visibleHeight = editor.getLayoutInfo().height;

      // 计算滚动百分比
      const scrollPercentage = scrollTop / (scrollHeight - visibleHeight);

      // 同步预览区域滚动
      const previewScrollHeight =
        previewContainer.scrollHeight - previewContainer.clientHeight;
      previewContainer.scrollTop = previewScrollHeight * scrollPercentage;
    };

    // 监听 Monaco 滚动事件
    const disposable = editor.onDidScrollChange(handleMonacoScroll);

    return () => {
      disposable.dispose();
    };
  }, []);

  return (
    <div className={`flex h-full w-full ${className}`}>
      {/* 左侧: Monaco 编辑器 */}
      <div
        ref={monacoContainerRef}
        className="w-1/2 h-full border-r border-foreground/10"
        onClick={() => {
          // 点击时确保编辑器获得焦点
          editorRef.current?.focus();
        }}
      >
        <MonacoEditor
          value={content}
          onChange={onChange}
          language={mode}
          onEditorReady={handleEditorReady}
          className="h-full"
        />
      </div>

      {/* 右侧: MDX 预览 */}
      <div ref={previewContainerRef} className="w-1/2 h-full">
        <LivePreview content={content} mode={mode} />
      </div>
    </div>
  );
}
