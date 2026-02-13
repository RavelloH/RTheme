"use client";

import { useEffect, useRef, useState } from "react";
import { loader } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import type { editor } from "monaco-editor";

export interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "markdown" | "mdx" | "html";
  className?: string;
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
}

const DEFAULT_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
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
  readOnly: false,
  domReadOnly: false,
  contextmenu: true,
  quickSuggestions: true,
  acceptSuggestionOnEnter: "on",
  tabCompletion: "on",
  formatOnPaste: true,
  formatOnType: true,
  insertSpaces: false,
  detectIndentation: false,
};

type Disposable = {
  dispose: () => void;
};

export function MonacoEditor({
  value,
  onChange,
  language,
  className = "",
  onEditorReady,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<editor.ITextModel | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const onChangeRef = useRef(onChange);
  const onEditorReadyRef = useRef(onEditorReady);
  const latestValueRef = useRef(value);
  const latestLanguageRef = useRef(language);
  const latestThemeRef = useRef<"vs-light" | "vs-dark">("vs-light");
  const focusTimerRef = useRef<number | null>(null);
  const modelPathRef = useRef(
    `inmemory://neutralpress/editor-${Math.random().toString(36).slice(2)}.md`,
  );

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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
  }, [onEditorReady]);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    latestLanguageRef.current = language;
  }, [language]);

  useEffect(() => {
    latestThemeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    let disposed = false;
    let contentDisposable: Disposable | null = null;

    const initializeEditor = async () => {
      try {
        const monaco = await loader.init();
        if (disposed || !containerRef.current) return;

        monacoRef.current = monaco;
        const modelUri = monaco.Uri.parse(modelPathRef.current);
        const model =
          monaco.editor.getModel(modelUri) ||
          monaco.editor.createModel(
            latestValueRef.current,
            latestLanguageRef.current,
            modelUri,
          );
        modelRef.current = model;

        const instance = monaco.editor.create(containerRef.current, {
          model,
          ...DEFAULT_EDITOR_OPTIONS,
        });

        editorRef.current = instance;
        monaco.editor.setTheme(latestThemeRef.current);

        contentDisposable = instance.onDidChangeModelContent(() => {
          onChangeRef.current(instance.getValue());
        });

        focusTimerRef.current = window.setTimeout(() => {
          if (disposed) return;
          instance.focus();
        }, 100);

        onEditorReadyRef.current?.(instance);
      } catch (error) {
        console.error("Failed to initialize Monaco editor:", error);
      }
    };

    void initializeEditor();

    return () => {
      disposed = true;

      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }

      contentDisposable?.dispose();

      const instance = editorRef.current;
      editorRef.current = null;
      instance?.dispose();

      const model = modelRef.current;
      modelRef.current = null;
      model?.dispose();

      monacoRef.current = null;
    };
  }, []);

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = modelRef.current;
    if (!monaco || !model) return;

    const nextLanguage = language === "markdown" ? "markdown" : language;
    monaco.editor.setModelLanguage(model, nextLanguage);
  }, [language]);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    monaco.editor.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance) return;

    const currentValue = instance.getValue();
    if (currentValue === value) return;

    const currentPosition = instance.getPosition();
    instance.setValue(value);
    if (currentPosition) {
      instance.setPosition(currentPosition);
    }
  }, [value]);

  return (
    <div
      className={`monaco-editor-wrapper ${className}`}
      style={{ width: "100%", height: "100%" }}
      data-monaco-editor="true"
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
