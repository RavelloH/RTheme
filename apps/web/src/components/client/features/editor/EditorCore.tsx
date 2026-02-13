"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiBold,
  RiCodeLine,
  RiCodeSSlashLine,
  RiDoubleQuotesL,
  RiEyeLine,
  RiEyeOffLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiFunctions,
  RiH1,
  RiH2,
  RiH3,
  RiH4,
  RiH5,
  RiH6,
  RiHeading,
  RiImageAddLine,
  RiItalic,
  RiListCheck2,
  RiListOrdered,
  RiListUnordered,
  RiMarkPenLine,
  RiMenuLine,
  RiSeparator,
  RiStrikethrough,
  RiSubscript,
  RiSuperscript,
  RiTable2,
  RiUnderline,
} from "@remixicon/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor as TiptapEditorType } from "@tiptap/react";
import type { editor } from "monaco-editor";

import {
  type AdapterManager,
  createAdapterManager,
  type EditorState as AdapterEditorState,
} from "@/components/client/features/editor/adapters";
import { CodeBlockToolbar } from "@/components/client/features/editor/CodeBlockToolbar";
import { ImageToolbar } from "@/components/client/features/editor/ImageToolbar";
import { LinkPopover } from "@/components/client/features/editor/LinkPopover";
import { LinkToolbar } from "@/components/client/features/editor/LinkToolbar";
import { ListToolbar } from "@/components/client/features/editor/ListToolbar";
import { LiveEditor } from "@/components/client/features/editor/LiveEditor";
import { MathDialog } from "@/components/client/features/editor/MathDialog";
import { TableSizePicker } from "@/components/client/features/editor/TableSizePicker";
import { TableToolbar } from "@/components/client/features/editor/TableToolbar";
import {
  setEditorToast,
  TiptapEditor,
} from "@/components/client/features/editor/TiptapEditor";
import MediaSelector from "@/components/client/features/media/MediaSelector";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { createArray } from "@/lib/client/create-array";
import {
  clearEditorContent,
  loadEditorContent,
  saveEditorContent,
} from "@/lib/client/editor-persistence";
import type { EditorCoreProps, EditorMode } from "@/types/editor-config";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import type { DropdownOption } from "@/ui/Dropdown";
import { Dropdown } from "@/ui/Dropdown";
import { Select } from "@/ui/Select";
import { useToast } from "@/ui/Toast";
import { Toggle } from "@/ui/Toggle";
import { Tooltip } from "@/ui/Tooltip";

type Disposable = {
  dispose: () => void;
};

/**
 * EditorCore - 纯 UI 编辑器组件
 *
 * 职责：
 * - 编辑器模式切换（Visual/Markdown/MDX/HTML）
 * - 编辑器实例管理
 * - 浮动工具栏渲染
 * - 字符统计
 * - 全屏模式
 *
 * 不负责：
 * - 业务逻辑（保存/发布）→ 由父组件处理
 * - 对话框渲染 → 由父组件通过 dialogs prop 配置
 * - 特定字段管理 → 由父组件管理
 */
export function EditorCore({
  content,
  storageKey,
  availableModes = ["visual", "markdown", "mdx"],
  defaultMode = "visual",
  dialogs = [],
  statusBarActions = [],
  onChange,
  title,
  onTitleChange,
  onSave: _onSave,
  onPublish: _onPublish,
  onModeChange,
  onExtraAction: _onExtraAction,
}: EditorCoreProps) {
  // ==================== 状态管理 ====================
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editor, setEditor] = useState<TiptapEditorType | null>(null);
  const [monacoEditor, setMonacoEditor] =
    useState<editor.IStandaloneCodeEditor | null>(null);
  const [isTableToolbarVisible, setIsTableToolbarVisible] = useState(false);
  const [showInvisibleChars, setShowInvisibleChars] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [initialContent, setInitialContent] = useState<string | undefined>(
    content,
  );
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const toast = useToast();
  const hasLoadedFromStorage = useRef(false);
  const isInitialMount = useRef(true);

  // 注入 toast 实例到 TiptapEditor
  useEffect(() => {
    setEditorToast(toast);
  }, [toast]);

  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isLinkToolbarVisible, setIsLinkToolbarVisible] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState("");
  const [isImageToolbarVisible, setIsImageToolbarVisible] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState("");
  const [currentImageAlt, setCurrentImageAlt] = useState("");
  const [isCodeBlockToolbarVisible, setIsCodeBlockToolbarVisible] =
    useState(false);
  const [currentCodeBlockLanguage, setCurrentCodeBlockLanguage] = useState("");
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);

  // 数学公式对话框状态
  const [isMathDialogOpen, setIsMathDialogOpen] = useState(false);
  const [mathDialogMode, setMathDialogMode] = useState<"insert" | "edit">(
    "insert",
  );
  const [mathDialogLatex, setMathDialogLatex] = useState("");
  const [mathDialogType, setMathDialogType] = useState<"inline" | "block">(
    "inline",
  );
  const [mathDialogPosition, setMathDialogPosition] = useState<
    number | undefined
  >(undefined);

  // 适配器管理器
  const adapterManagerRef = useRef<AdapterManager | null>(null);
  const lastContentTitleRef = useRef<string | null>(null);
  const monacoDisposeRef = useRef<Disposable | null>(null);

  // 初始化编辑器类型
  const [editorType, setEditorType] = useState<EditorMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem("editor");
        if (savedData) {
          const editorData = JSON.parse(savedData);
          const savedEditorType = editorData[storageKey]?.config?.editorType;
          if (
            savedEditorType &&
            availableModes.includes(savedEditorType as EditorMode)
          ) {
            return savedEditorType as EditorMode;
          }
        }
      } catch (error) {
        console.error("Failed to load editor type from localStorage:", error);
      }
    }

    // 检查 defaultMode 是否在 availableModes 中
    if (availableModes.includes(defaultMode)) {
      return defaultMode;
    }

    // 否则返回第一个可用模式
    return availableModes[0] || "visual";
  });

  const loadContentFromStorage = useCallback(() => {
    const savedData = loadEditorContent(storageKey);
    if (savedData && typeof savedData.content === "string") {
      return {
        content: savedData.content,
        hasSavedDraft: true,
        lastUpdatedAt: savedData.lastUpdatedAt,
      };
    }

    const fallbackContent = content || "";
    saveEditorContent(
      fallbackContent,
      { editorType: String(editorType) },
      true,
      storageKey,
    );

    return {
      content: fallbackContent,
      hasSavedDraft: false,
      lastUpdatedAt: null,
    };
  }, [content, editorType, storageKey]);

  const extractTitleFromMarkdown = useCallback(
    (markdown: string): string | null => {
      const headingMatch = markdown.match(/(^|\r?\n)#\s+([^\r\n]*)(?=\r?\n|$)/);
      if (!headingMatch) {
        return null;
      }

      const rawTitle = headingMatch[2];
      return rawTitle ? rawTitle.trim() : null;
    },
    [],
  );

  const upsertTitleInMarkdown = useCallback(
    (markdown: string, nextTitle: string): string => {
      const normalizedTitle = nextTitle.trim();
      const headingRegex = /(^|\r?\n)#\s+([^\r\n]*)(\r?\n|$)/;

      if (headingRegex.test(markdown)) {
        if (!normalizedTitle) {
          return markdown
            .replace(
              headingRegex,
              (
                _match,
                prefix: string,
                _rawTitle: string,
                lineEnding: string,
              ) => {
                return `${prefix}${lineEnding}`;
              },
            )
            .replace(/^(?:\r?\n)+/, "");
        }

        return markdown.replace(
          headingRegex,
          (_match, prefix: string, _rawTitle: string, lineEnding: string) =>
            `${prefix}# ${normalizedTitle}${lineEnding}`,
        );
      }

      if (!normalizedTitle) {
        return markdown;
      }

      const lineEnding = markdown.includes("\r\n") ? "\r\n" : "\n";
      if (!markdown.trim()) {
        return `# ${normalizedTitle}${lineEnding}`;
      }

      return `# ${normalizedTitle}${lineEnding}${lineEnding}${markdown.replace(/^(?:\r?\n)+/, "")}`;
    },
    [],
  );

  const syncTitleFromContent = useCallback(
    (nextContent: string) => {
      const extractedTitle = extractTitleFromMarkdown(nextContent);
      const normalizedExtractedTitle = extractedTitle?.trim() ?? null;

      if (normalizedExtractedTitle === lastContentTitleRef.current) {
        return;
      }
      lastContentTitleRef.current = normalizedExtractedTitle;

      if (!onTitleChange || normalizedExtractedTitle === null) {
        return;
      }

      if ((title || "").trim() === normalizedExtractedTitle) {
        return;
      }

      onTitleChange(normalizedExtractedTitle);
    },
    [extractTitleFromMarkdown, onTitleChange, title],
  );

  // 编辑器状态
  const [editorState, setEditorState] = useState<AdapterEditorState>({
    isBold: false,
    isItalic: false,
    isStrike: false,
    isUnderline: false,
    isHighlight: false,
    isCode: false,
    isSuperscript: false,
    isSubscript: false,
    isBlockquote: false,
    isCodeBlock: false,
    isTable: false,
    isLink: false,
    isImage: false,
    isBulletList: false,
    isOrderedList: false,
    isTaskList: false,
    headingLevel: null,
    textAlign: null,
    currentLinkUrl: "",
    currentImageSrc: "",
    currentImageAlt: "",
    currentCodeBlockLanguage: "",
  });

  // ==================== 初始化适配器管理器 ====================
  useEffect(() => {
    if (!adapterManagerRef.current) {
      adapterManagerRef.current = createAdapterManager(
        {
          storageKey,
          enablePersistence: true,
        },
        {
          onStateChange: (state) => {
            setEditorState(state);
            setIsTableToolbarVisible(state.isTable);
            setIsLinkToolbarVisible(state.isLink);
            setCurrentLinkUrl(state.currentLinkUrl);
            setIsImageToolbarVisible(state.isImage);
            setCurrentImageSrc(state.currentImageSrc);
            setCurrentImageAlt(state.currentImageAlt);
            setIsCodeBlockToolbarVisible(state.isCodeBlock);
            setCurrentCodeBlockLanguage(state.currentCodeBlockLanguage);
          },
          onContentChange: () => {
            // 内容变化时的处理
            console.log("Content changed via adapter");
          },
        },
      );
    }

    return () => {
      monacoDisposeRef.current?.dispose();
      monacoDisposeRef.current = null;
      adapterManagerRef.current?.destroy();
      adapterManagerRef.current = null;
    };
  }, [storageKey]);

  // ==================== 加载保存的内容 ====================
  useEffect(() => {
    if (hasLoadedFromStorage.current) return;

    const storageData = loadContentFromStorage();
    const storageContent = storageData.content;

    setInitialContent(storageContent);
    setMarkdownContent(storageContent);
    hasLoadedFromStorage.current = true;
    syncTitleFromContent(storageContent);

    if (storageData.hasSavedDraft && isInitialMount.current) {
      const lastUpdated = new Date(
        storageData.lastUpdatedAt ?? "",
      ).toLocaleString("zh-CN");

      toast.info("已加载草稿", `上次保存于 ${lastUpdated}`, 10000, {
        label: "撤销",
        onClick: () => {
          clearEditorContent(storageKey);
          const fallbackContent = content || "";
          setInitialContent(fallbackContent);
          setMarkdownContent(fallbackContent);
          saveEditorContent(
            fallbackContent,
            { editorType: String(editorType) },
            true,
            storageKey,
          );
          toast.success("已撤销", "草稿已删除");
        },
      });
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [
    content,
    editorType,
    loadContentFromStorage,
    storageKey,
    syncTitleFromContent,
    toast,
  ]);

  const getCurrentEditorContent = useCallback(() => {
    try {
      if (editorType === "visual" && editor) {
        return editor.getMarkdown().replace(/\n{3,}/g, "\n\n");
      }

      if (
        (editorType === "markdown" ||
          editorType === "mdx" ||
          editorType === "html") &&
        monacoEditor
      ) {
        return monacoEditor.getValue();
      }

      const adapterContent = adapterManagerRef.current?.getContent();
      if (typeof adapterContent === "string") {
        return adapterContent;
      }
    } catch (error) {
      console.error("Failed to get current editor content:", error);
    }

    const savedData = loadEditorContent(storageKey);
    if (savedData && typeof savedData.content === "string") {
      return savedData.content;
    }

    return content || "";
  }, [content, editor, editorType, monacoEditor, storageKey]);

  const handleModeSwitch = useCallback(
    (nextMode: EditorMode) => {
      if (nextMode === editorType) return;

      const latestContent = getCurrentEditorContent();

      saveEditorContent(
        latestContent,
        {
          editorType: String(nextMode),
          isFullscreen,
          showTableOfContents,
        },
        true,
        storageKey,
      );

      setInitialContent(latestContent);
      setMarkdownContent(latestContent);
      syncTitleFromContent(latestContent);
      hasLoadedFromStorage.current = false;

      setEditorType(nextMode);
      onModeChange?.(nextMode);
    },
    [
      editorType,
      getCurrentEditorContent,
      isFullscreen,
      onModeChange,
      showTableOfContents,
      storageKey,
      syncTitleFromContent,
    ],
  );

  const handleEditorContentChange = useCallback(
    (nextContent: string) => {
      setMarkdownContent(nextContent);

      try {
        saveEditorContent(
          nextContent,
          {
            editorType: String(editorType),
            isFullscreen,
            showTableOfContents,
          },
          true,
          storageKey,
        );
      } catch (error) {
        console.error("Failed to auto-save draft:", error);
      }

      onChange?.(nextContent);
      syncTitleFromContent(nextContent);
    },
    [
      editorType,
      isFullscreen,
      onChange,
      showTableOfContents,
      storageKey,
      syncTitleFromContent,
    ],
  );

  useEffect(() => {
    if (typeof title !== "string") {
      return;
    }
    const normalizedTitle = title.trim();

    const hasActiveEditor =
      editorType === "visual"
        ? !!editor
        : editorType === "markdown" ||
            editorType === "mdx" ||
            editorType === "html"
          ? !!monacoEditor
          : false;
    if (!hasActiveEditor) {
      return;
    }

    const currentContent = getCurrentEditorContent();
    if (!currentContent.trim()) {
      return;
    }

    const currentTitle = extractTitleFromMarkdown(currentContent) || "";
    if (currentTitle === normalizedTitle) {
      return;
    }

    const nextContent = upsertTitleInMarkdown(currentContent, normalizedTitle);
    if (nextContent === currentContent) {
      return;
    }

    saveEditorContent(
      nextContent,
      {
        editorType: String(editorType),
        isFullscreen,
        showTableOfContents,
      },
      true,
      storageKey,
    );

    setInitialContent(nextContent);
    setMarkdownContent(nextContent);
    onChange?.(nextContent);

    if (editorType === "visual" && editor) {
      try {
        // @ts-expect-error - markdown.parse方法可能没有类型定义
        const parsed = editor.markdown.parse(nextContent);
        editor.commands.setContent(parsed);
      } catch (error) {
        console.error("Failed to sync title to visual editor:", error);
      }
    }

    if (
      (editorType === "markdown" ||
        editorType === "mdx" ||
        editorType === "html") &&
      monacoEditor
    ) {
      try {
        const currentPosition = monacoEditor.getPosition();
        monacoEditor.setValue(nextContent);
        if (currentPosition) {
          monacoEditor.setPosition(currentPosition);
        }
      } catch (error) {
        console.error("Failed to sync title to code editor:", error);
      }
    }
  }, [
    editor,
    editorType,
    extractTitleFromMarkdown,
    getCurrentEditorContent,
    isFullscreen,
    monacoEditor,
    onChange,
    showTableOfContents,
    storageKey,
    title,
    upsertTitleInMarkdown,
  ]);

  // ==================== 编辑器类型切换时重置加载标记 ====================
  useEffect(() => {
    hasLoadedFromStorage.current = false;
  }, [editorType]);

  // ==================== 全屏切换 ====================
  const toggleFullscreen = async () => {
    const editorElement = document.getElementById("editor-core-container");
    if (!editorElement) return;

    try {
      if (!document.fullscreenElement) {
        await editorElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("全屏切换失败:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // ==================== 工具栏操作 ====================
  const handleUndo = () => {
    adapterManagerRef.current?.executeCommand("undo");
  };

  const handleRedo = () => {
    adapterManagerRef.current?.executeCommand("redo");
  };

  const handleBold = () => {
    adapterManagerRef.current?.executeCommand("bold");
  };

  const handleItalic = () => {
    adapterManagerRef.current?.executeCommand("italic");
  };

  const handleStrike = () => {
    adapterManagerRef.current?.executeCommand("strike");
  };

  const handleUnderline = () => {
    adapterManagerRef.current?.executeCommand("underline");
  };

  const handleHighlight = () => {
    adapterManagerRef.current?.executeCommand("highlight");
  };

  const handleBlockquote = () => {
    adapterManagerRef.current?.executeCommand("blockquote");
  };

  const handleCode = () => {
    adapterManagerRef.current?.executeCommand("code");
  };

  const handleCodeBlock = () => {
    adapterManagerRef.current?.executeCommand("codeBlock");
  };

  const handleInsertTable = (rows: number, cols: number) => {
    adapterManagerRef.current?.executeCommandWithParams("insertTable", {
      rows,
      cols,
    });
  };

  const handleLinkSubmit = (text: string, url: string) => {
    adapterManagerRef.current?.executeCommandWithParams("insertLink", {
      text,
      url,
    });
  };

  const handleEditLink = () => {
    if (!editor) return;

    const { state } = editor;
    const { from } = state.selection;
    const linkMark = state.schema.marks.link;

    if (!linkMark) {
      setIsLinkPopoverOpen(true);
      return;
    }

    const attrs = editor.getAttributes("link");
    if (!attrs.href) {
      setIsLinkPopoverOpen(true);
      return;
    }

    let start = from;
    let end = from;

    state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
      if (node.isText) {
        const marks = node.marks;
        const linkMarkInNode = marks.find(
          (m) => m.type === linkMark && m.attrs.href === attrs.href,
        );

        if (linkMarkInNode) {
          const nodeStart = pos;
          const nodeEnd = pos + node.nodeSize;

          if (from >= nodeStart && from <= nodeEnd) {
            start = nodeStart;
            end = nodeEnd;
            return false;
          }
        }
      }
    });

    editor.chain().focus().setTextSelection({ from: start, to: end }).run();

    setTimeout(() => {
      setIsLinkPopoverOpen(true);
    }, 10);
  };

  const handleEditImageAlt = (alt: string) => {
    adapterManagerRef.current?.executeCommandWithParams("editImage", { alt });
  };

  const handleImage = () => {
    setIsImageSelectorOpen(true);
  };

  const handleImageSelect = (url: string | string[]) => {
    if (!url) return;

    const urls = Array.isArray(url) ? url : [url];
    const validUrls = urls.filter((u) => u && u.trim());

    if (validUrls.length === 0) {
      console.warn("No valid image URLs provided");
      return;
    }

    if (validUrls.length > 1) {
      adapterManagerRef.current?.executeCommandWithParams("insertImages", {
        urls: validUrls,
        alt: "图片",
      });
    } else {
      const firstUrl = validUrls[0];
      if (firstUrl) {
        adapterManagerRef.current?.executeCommandWithParams("insertImage", {
          url: firstUrl,
          alt: "图片",
        });
      }
    }

    setIsImageSelectorOpen(false);
  };

  const handleHorizontalRule = () => {
    adapterManagerRef.current?.executeCommand("horizontalRule");
  };

  const handleSuperscript = () => {
    adapterManagerRef.current?.executeCommand("superscript");
  };

  const handleSubscript = () => {
    adapterManagerRef.current?.executeCommand("subscript");
  };

  const handleMath = () => {
    setMathDialogMode("insert");
    setMathDialogLatex("");
    setMathDialogType("inline");
    setMathDialogPosition(undefined);
    setIsMathDialogOpen(true);
  };

  const handleMathClick = (
    latex: string,
    type: "inline" | "block",
    position: number,
  ) => {
    setMathDialogMode("edit");
    setMathDialogLatex(latex);
    setMathDialogType(type);
    setMathDialogPosition(position);
    setIsMathDialogOpen(true);
  };

  const toggleInvisibleChars = () => {
    setShowInvisibleChars(!showInvisibleChars);
  };

  const setColumnAlignment = (align: "left" | "center" | "right") => {
    if (!editor) return;

    const { state, view } = editor;
    const { selection } = state;
    const currentPos = selection.from;
    const isCellSelection = selection.constructor.name === "CellSelection";

    if (isCellSelection) {
      return;
    }

    const { $anchor } = selection;
    let cellDepth = 0;
    for (let d = $anchor.depth; d > 0; d--) {
      if (
        $anchor.node(d).type.name === "tableCell" ||
        $anchor.node(d).type.name === "tableHeader"
      ) {
        cellDepth = d;
        break;
      }
    }

    if (!cellDepth) return;

    const tableDepth = cellDepth - 2;
    const table = $anchor.node(tableDepth);

    let colIndex = 0;
    for (let i = 0; i < $anchor.index(cellDepth - 1); i++) {
      colIndex++;
    }

    const { tr } = state;
    let updated = false;

    table.forEach((rowNode: ProseMirrorNode, rowOffset: number) => {
      if (rowNode.type.name === "tableRow") {
        let currentCol = 0;
        rowNode.forEach((cellNode: ProseMirrorNode, cellOffset: number) => {
          if (currentCol === colIndex) {
            const cellPos =
              $anchor.start(tableDepth) + rowOffset + cellOffset + 1;
            const cellType = cellNode.type;

            const newAttrs = { ...cellNode.attrs, textAlign: align };
            const newCell = cellType.create(
              newAttrs,
              cellNode.content,
              cellNode.marks,
            );

            tr.replaceWith(cellPos, cellPos + cellNode.nodeSize, newCell);
            updated = true;
          }
          currentCol++;
        });
      }
    });

    if (updated) {
      try {
        const $pos = tr.doc.resolve(currentPos);
        const newSelection = TextSelection.near($pos);
        tr.setSelection(newSelection);
      } catch (e) {
        console.warn("Failed to restore cursor position:", e);
      }
      view.dispatch(tr);
    }
  };

  const handleAlignLeft = () => {
    if (editorState.isTable) {
      setColumnAlignment("left");
    } else {
      adapterManagerRef.current?.executeCommand("alignLeft");
    }
  };

  const handleAlignCenter = () => {
    if (editorState.isTable) {
      setColumnAlignment("center");
    } else {
      adapterManagerRef.current?.executeCommand("alignCenter");
    }
  };

  const handleAlignRight = () => {
    if (editorState.isTable) {
      setColumnAlignment("right");
    } else {
      adapterManagerRef.current?.executeCommand("alignRight");
    }
  };

  // ==================== 编辑器就绪回调 ====================
  const handleEditorReady = useCallback(
    (editorInstance: TiptapEditorType) => {
      setEditor(editorInstance);

      if (adapterManagerRef.current) {
        adapterManagerRef.current.registerTiptapEditor(editorInstance);
      }

      const savedData = loadEditorContent(storageKey);
      const storedContent =
        savedData && typeof savedData.content === "string"
          ? savedData.content
          : "";

      if (!storedContent) return;

      try {
        // @ts-expect-error - markdown.parse方法可能没有类型定义
        const parsed = editorInstance.markdown.parse(storedContent);
        editorInstance.commands.setContent(parsed);
        setInitialContent(storedContent);
      } catch (error) {
        console.error(
          "Failed to initialize visual editor from storage:",
          error,
        );
      }
    },
    [storageKey],
  );

  // ==================== 标题选项 ====================
  const headingOptions: DropdownOption[] = [
    {
      value: "h1",
      label: "标题 1",
      icon: <RiH1 size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommandWithParams("heading", {
          level: 1,
        });
      },
      Tooltip: {
        content: "Ctrl+Alt+1",
        placement: "right",
      },
    },
    {
      value: "h2",
      label: "标题 2",
      icon: <RiH2 size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommandWithParams("heading", {
          level: 2,
        });
      },
      Tooltip: {
        content: "Ctrl+Alt+2",
        placement: "right",
      },
    },
    {
      value: "h3",
      label: "标题 3",
      icon: <RiH3 size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommandWithParams("heading", {
          level: 3,
        });
      },
      Tooltip: {
        content: "Ctrl+Alt+3",
        placement: "right",
      },
    },
    {
      value: "h4",
      label: "标题 4",
      icon: <RiH4 size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommandWithParams("heading", {
          level: 4,
        });
      },
      Tooltip: {
        content: "Ctrl+Alt+4",
        placement: "right",
      },
    },
    {
      value: "h5",
      label: "标题 5",
      icon: <RiH5 size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommandWithParams("heading", {
          level: 5,
        });
      },
      Tooltip: {
        content: "Ctrl+Alt+5",
        placement: "right",
      },
    },
    {
      value: "h6",
      label: "标题 6",
      icon: <RiH6 size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommandWithParams("heading", {
          level: 6,
        });
      },
      Tooltip: {
        content: "Ctrl+Alt+6",
        placement: "right",
      },
    },
  ];

  // ==================== 列表选项 ====================
  const listOptions: DropdownOption[] = [
    {
      value: "ordered",
      label: "有序列表",
      icon: <RiListOrdered size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommand("orderedList");
      },
      Tooltip: {
        content: "Ctrl+Shift+7",
        placement: "right",
      },
    },
    {
      value: "unordered",
      label: "无序列表",
      icon: <RiListUnordered size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommand("bulletList");
      },
      Tooltip: {
        content: "Ctrl+Shift+8",
        placement: "right",
      },
    },
    {
      value: "task",
      label: "待办事项",
      icon: <RiListCheck2 size="1.2em" />,
      onClick: () => {
        adapterManagerRef.current?.executeCommand("taskList");
      },
      Tooltip: {
        content: "Ctrl+Shift+9",
        placement: "right",
      },
    },
  ];

  // ==================== 对齐选项 ====================
  const alignOptions: DropdownOption[] = [
    {
      value: "left",
      label: "左对齐",
      icon: <RiAlignLeft size="1.2em" />,
      onClick: handleAlignLeft,
      Tooltip: {
        content: "Ctrl+Shift+L",
        placement: "right",
      },
    },
    {
      value: "center",
      label: "居中对齐",
      icon: <RiAlignCenter size="1.2em" />,
      onClick: handleAlignCenter,
      Tooltip: {
        content: "Ctrl+Shift+E",
        placement: "right",
      },
    },
    {
      value: "right",
      label: "右对齐",
      icon: <RiAlignRight size="1.2em" />,
      onClick: handleAlignRight,
      Tooltip: {
        content: "Ctrl+Shift+R",
        placement: "right",
      },
    },
  ];

  // ==================== 工具栏按钮 ====================
  const toolbarButtons = [
    {
      icon: <RiArrowGoBackLine size="1.2em" />,
      action: handleUndo,
      name: "撤销 (Ctrl+Z)",
    },
    {
      icon: <RiArrowGoForwardLine size="1.2em" />,
      action: handleRedo,
      name: "取消撤销 (Ctrl+Shift+Z)",
    },
  ];

  const formattingButtons = [
    {
      icon: <RiBold size="1.2em" />,
      action: handleBold,
      name: "加粗 (Ctrl+B)",
      value: "bold",
      isActive: editorState.isBold,
    },
    {
      icon: <RiItalic size="1.2em" />,
      action: handleItalic,
      name: "斜体 (Ctrl+I)",
      value: "italic",
      isActive: editorState.isItalic,
    },
    {
      icon: <RiStrikethrough size="1.2em" />,
      action: handleStrike,
      name: "删除线 (Ctrl+Shift+S)",
      value: "strikethrough",
      isActive: editorState.isStrike,
    },
    {
      icon: <RiUnderline size="1.2em" />,
      action: handleUnderline,
      name: "下划线 (Ctrl+U)",
      value: "underline",
      isActive: editorState.isUnderline,
    },
    {
      icon: <RiMarkPenLine size="1.2em" />,
      action: handleHighlight,
      name: "高亮 (Ctrl+Shift+H)",
      value: "highlight",
      isActive: editorState.isHighlight,
    },
  ];

  const blockButtons = [
    {
      icon: <RiDoubleQuotesL size="1.2em" />,
      action: handleBlockquote,
      name: "引用 (Ctrl+Shift+B)",
      isActive: editorState.isBlockquote,
    },
    {
      icon: <RiCodeLine size="1.2em" />,
      action: handleCode,
      name: "行内代码 (Ctrl+E)",
      value: "code",
      isActive: editorState.isCode,
    },
    {
      icon: <RiCodeSSlashLine size="1.2em" />,
      action: handleCodeBlock,
      name: "代码块 (Ctrl+Alt+C)",
      isActive: editorState.isCodeBlock,
    },
  ];

  const insertButtons = [
    {
      icon: <RiImageAddLine size="1.2em" />,
      action: handleImage,
      name: "插入图片",
    },
    {
      icon: <RiFunctions size="1.2em" />,
      action: handleMath,
      name: "插入数学公式",
    },
    {
      icon: <RiSeparator size="1.2em" />,
      action: handleHorizontalRule,
      name: "分隔线",
    },
    {
      icon: <RiSuperscript size="1.2em" />,
      action: handleSuperscript,
      name: "上标 (Ctrl+.)",
      value: "superscript",
      isActive: editorState.isSuperscript,
    },
    {
      icon: <RiSubscript size="1.2em" />,
      action: handleSubscript,
      name: "下标 (Ctrl+,)",
      value: "subscript",
      isActive: editorState.isSubscript,
    },
  ];

  return (
    <RowGrid
      className={`w-full ${isFullscreen ? "fixed inset-0 z-[9999] bg-background" : "max-h-[100vh]"}`}
      id="editor-core-container"
      full
    >
      <GridItem
        areas={[1]}
        width={3.2}
        className="flex items-center justify-center px-4 gap-2 border-b border-foreground/10"
      >
        <div className="flex items-center gap-2 w-full justify-center">
          {/* 撤销/重做按钮 */}
          <div className="flex gap-1">
            {toolbarButtons.map((button, index) => (
              <Tooltip key={index} content={button.name}>
                <Toggle
                  size="sm"
                  variant="default"
                  onClick={button.action}
                  tabIndex={-1}
                >
                  {button.icon}
                </Toggle>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-foreground/20" />

          {/* 标题下拉菜单 */}
          <Dropdown
            trigger={
              <div className="inline-flex items-center justify-center gap-0 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2">
                <RiHeading size="1.2em" />
              </div>
            }
            options={headingOptions}
          />

          <div className="w-px h-6 bg-foreground/20" />

          {/* 文本格式化按钮组 */}
          <div className="flex gap-1">
            {formattingButtons.map((button, index) => (
              <Tooltip key={index} content={button.name}>
                <Toggle
                  size="sm"
                  variant="default"
                  pressed={button.isActive}
                  onClick={button.action}
                  tabIndex={-1}
                >
                  {button.icon}
                </Toggle>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-foreground/20" />

          {/* 对齐下拉菜单 */}
          <Dropdown
            trigger={
              <div className="inline-flex items-center justify-center gap-0 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2">
                <RiAlignLeft size="1.2em" />
              </div>
            }
            options={alignOptions}
          />

          <div className="w-px h-6 bg-foreground/20" />

          {/* 列表下拉菜单 */}
          <Dropdown
            trigger={
              <div className="inline-flex items-center justify-center gap-0 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2">
                <RiListUnordered size="1.2em" />
              </div>
            }
            options={listOptions}
          />

          <div className="w-px h-6 bg-foreground/20" />

          {/* 块级元素按钮 */}
          <div className="flex gap-1">
            {blockButtons.map((button, index) => (
              <Tooltip key={index} content={button.name}>
                <Toggle
                  size="sm"
                  variant="default"
                  pressed={button.isActive}
                  onClick={button.action}
                  tabIndex={-1}
                >
                  {button.icon}
                </Toggle>
              </Tooltip>
            ))}

            {/* 插入表格按钮 */}
            <TableSizePicker
              onSelect={handleInsertTable}
              trigger={
                <Tooltip content="插入表格">
                  <div className="inline-flex items-center justify-center gap-0 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2">
                    <RiTable2 size="1.2em" />
                  </div>
                </Tooltip>
              }
            />
          </div>

          <div className="w-px h-6 bg-foreground/20" />

          {/* 插入元素按钮 */}
          <div className="flex gap-1">
            {/* 链接按钮 - 使用 Popover */}
            <Tooltip content="链接">
              <LinkPopover
                open={isLinkPopoverOpen}
                onOpenChange={setIsLinkPopoverOpen}
                onSubmit={handleLinkSubmit}
                initialText={
                  editor?.state.doc.textBetween(
                    editor?.state.selection.from,
                    editor?.state.selection.to,
                    "",
                  ) || ""
                }
                initialUrl={
                  editor?.isActive("link")
                    ? editor?.getAttributes("link").href || ""
                    : ""
                }
                isActive={editor?.isActive("link") || false}
              />
            </Tooltip>

            {insertButtons.map((button, index) => (
              <Tooltip key={index} content={button.name}>
                <Toggle
                  size="sm"
                  variant="default"
                  pressed={button.isActive}
                  onClick={button.action}
                  tabIndex={-1}
                >
                  {button.icon}
                </Toggle>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-foreground/20" />

          {/* 不可见字符按钮 */}
          <Tooltip
            content={
              editorType !== "visual"
                ? "仅可视化编辑器支持"
                : showInvisibleChars
                  ? "隐藏不可见字符"
                  : "显示不可见字符"
            }
          >
            <Toggle
              size="sm"
              variant="default"
              pressed={showInvisibleChars}
              onClick={toggleInvisibleChars}
              disabled={editorType !== "visual"}
              tabIndex={-1}
            >
              {showInvisibleChars ? (
                <RiEyeOffLine size="1.2em" />
              ) : (
                <RiEyeLine size="1.2em" />
              )}
            </Toggle>
          </Tooltip>

          {/* 目录切换按钮 */}
          <Tooltip
            content={
              editorType !== "visual"
                ? "仅可视化编辑器支持"
                : showTableOfContents
                  ? "隐藏目录"
                  : "显示目录"
            }
          >
            <Toggle
              size="sm"
              variant="default"
              pressed={showTableOfContents}
              onClick={() => setShowTableOfContents(!showTableOfContents)}
              disabled={editorType !== "visual"}
              tabIndex={-1}
            >
              <RiMenuLine size="1.2em" />
            </Toggle>
          </Tooltip>

          {/* 全屏按钮 */}
          <Tooltip content={isFullscreen ? "退出全屏" : "全屏"}>
            <Toggle
              size="sm"
              variant="default"
              pressed={isFullscreen}
              onPressedChange={toggleFullscreen}
              tabIndex={-1}
            >
              {isFullscreen ? (
                <RiFullscreenExitLine size="1.2em" />
              ) : (
                <RiFullscreenLine size="1.2em" />
              )}
            </Toggle>
          </Tooltip>
        </div>
      </GridItem>

      <GridItem
        areas={createArray(2, 11)}
        className={`overflow-hidden bg-background relative ${isFullscreen ? "h-screen" : ""}`}
        height={1.5}
      >
        {editorType === "visual" ? (
          <>
            <TiptapEditor
              placeholder="开始编写你的内容..."
              content={initialContent}
              onChange={handleEditorContentChange}
              onEditorReady={handleEditorReady}
              className="h-full"
              showInvisibleChars={showInvisibleChars}
              showTableOfContents={showTableOfContents}
              enablePersistence={true}
              editorConfig={{
                editorType: String(editorType),
                isFullscreen,
                showTableOfContents,
              }}
              storageKey={storageKey}
              onMathClick={handleMathClick}
            />

            {/* 浮动工具栏 */}
            {editor && (
              <>
                <TableToolbar
                  editor={editor}
                  isVisible={isTableToolbarVisible}
                />
                <LinkToolbar
                  editor={editor}
                  isVisible={isLinkToolbarVisible}
                  linkUrl={currentLinkUrl}
                  onEdit={handleEditLink}
                />
                <ImageToolbar
                  editor={editor}
                  isVisible={isImageToolbarVisible}
                  imageSrc={currentImageSrc}
                  imageAlt={currentImageAlt}
                  onEditAlt={handleEditImageAlt}
                />
                <CodeBlockToolbar
                  editor={editor}
                  isVisible={isCodeBlockToolbarVisible}
                  currentLanguage={currentCodeBlockLanguage}
                />
                <ListToolbar editor={editor} />
              </>
            )}
          </>
        ) : (
          <LiveEditor
            content={markdownContent}
            onChange={handleEditorContentChange}
            mode={
              editorType === "mdx"
                ? "mdx"
                : editorType === "html"
                  ? "html"
                  : "markdown"
            }
            onEditorReady={(monacoInstance) => {
              monacoDisposeRef.current?.dispose();
              monacoDisposeRef.current = monacoInstance.onDidDispose(() => {
                setMonacoEditor((current) =>
                  current === monacoInstance ? null : current,
                );
              });

              setMonacoEditor(monacoInstance);

              if (adapterManagerRef.current) {
                if (editorType === "mdx") {
                  adapterManagerRef.current.registerMDXEditor(monacoInstance);
                } else if (editorType === "html") {
                  adapterManagerRef.current.registerHTMLEditor(monacoInstance);
                } else {
                  adapterManagerRef.current.registerMarkdownEditor(
                    monacoInstance,
                  );
                }
              }

              const savedData = loadEditorContent(storageKey);
              const storedContent =
                savedData && typeof savedData.content === "string"
                  ? savedData.content
                  : "";
              try {
                monacoInstance.setValue(storedContent);
                monacoInstance.setPosition({ lineNumber: 1, column: 1 });
                setMarkdownContent(storedContent);
              } catch (error) {
                console.error("Failed to initialize code editor:", error);
              }
            }}
          />
        )}
      </GridItem>

      <GridItem
        areas={[12]}
        width={3.2}
        height={0.15}
        className={`flex px-10 items-center justify-between border-t border-foreground/10 ${isFullscreen ? "hidden" : ""}`}
      >
        {/* 左侧：编辑器类型选择 + 字数统计 */}
        <div className="flex items-center gap-4">
          <Select
            value={editorType}
            onChange={(value) => handleModeSwitch(value as EditorMode)}
            options={availableModes.map((mode) => ({
              value: mode,
              label:
                mode === "visual"
                  ? "可视化编辑器"
                  : mode === "markdown"
                    ? "Markdown"
                    : mode === "mdx"
                      ? "MDX (Beta)"
                      : "HTML",
            }))}
            size="sm"
          />
          <div className="text-sm text-foreground/60">
            {adapterManagerRef.current ? (
              <span>字符: {adapterManagerRef.current.getContent().length}</span>
            ) : (
              <span>字符: 0</span>
            )}
          </div>
        </div>

        {/* 图片选择器 */}
        <MediaSelector
          open={isImageSelectorOpen}
          onOpenChange={setIsImageSelectorOpen}
          onChange={handleImageSelect}
          multiple
          hideTrigger
          defaultTab="upload"
        />

        {/* 数学公式编辑对话框 */}
        <MathDialog
          isOpen={isMathDialogOpen}
          onClose={() => setIsMathDialogOpen(false)}
          editor={editor}
          initialLatex={mathDialogLatex}
          initialType={mathDialogType}
          position={mathDialogPosition}
          mode={mathDialogMode}
        />

        {/* 右侧：操作按钮 - 由父组件配置 */}
        <div className="flex gap-2">
          {statusBarActions.map((action) => (
            <Button
              key={action.id}
              label={action.label}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
              loading={action.loading}
              loadingText={action.loadingText}
              disabled={action.disabled}
              icon={action.icon}
            />
          ))}
        </div>
      </GridItem>

      {/* 对话框占位符 - 对话框由父组件处理 */}
      {dialogs.length > 0 && (
        <>
          {dialogs.map((dialogConfig) => {
            // 如果对话框提供了自定义内容渲染函数，使用它
            if (dialogConfig.renderContent) {
              return (
                <Dialog
                  key={dialogConfig.id}
                  open={dialogConfig.open ?? false}
                  onClose={() => dialogConfig.onOpenChange?.(false)}
                  title={dialogConfig.title}
                  size={dialogConfig.size}
                >
                  {dialogConfig.renderContent({
                    formData: {},
                    onFieldChange: () => {},
                    onClose: () => dialogConfig.onOpenChange?.(false),
                  })}
                  {dialogConfig.actions && dialogConfig.actions.length > 0 && (
                    <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10 px-6 pb-6">
                      {dialogConfig.actions.map((action) => (
                        <Button
                          key={action.id}
                          label={action.label}
                          variant={action.variant}
                          size="sm"
                          onClick={() => action.onClick({})}
                          loading={action.loading}
                          loadingText={action.loadingText}
                          disabled={action.disabled}
                        />
                      ))}
                    </div>
                  )}
                </Dialog>
              );
            }
            return null;
          })}
        </>
      )}
    </RowGrid>
  );
}
