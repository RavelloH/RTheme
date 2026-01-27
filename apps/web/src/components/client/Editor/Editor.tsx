/* eslint-disable @next/next/no-img-element */
"use client";

import { createArray } from "@/lib/client/create-array";
import RowGrid, { GridItem } from "../../RowGrid";
import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiListOrdered,
  RiListUnordered,
  RiDoubleQuotesL,
  RiCodeSSlashLine,
  RiBold,
  RiItalic,
  RiStrikethrough,
  RiUnderline,
  RiMarkPenLine,
  RiSuperscript,
  RiSubscript,
  RiImageAddLine,
  RiSeparator,
  RiFullscreenLine,
  RiFullscreenExitLine,
  RiHeading,
  RiH1,
  RiH2,
  RiH3,
  RiH4,
  RiH5,
  RiH6,
  RiListCheck2,
  RiCodeLine,
  RiTable2,
  RiEyeLine,
  RiEyeOffLine,
  RiMenuLine,
  RiAlignLeft,
  RiAlignCenter,
  RiAlignRight,
  RiFunctions,
} from "@remixicon/react";
import { Toggle } from "@/ui/Toggle";
import type { DropdownOption } from "@/ui/Dropdown";
import { Dropdown } from "@/ui/Dropdown";
import { useState, useCallback, useEffect, useRef } from "react";
import { Tooltip } from "@/ui/Tooltip";
import { Select } from "@/ui/Select";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Checkbox } from "@/ui/Checkbox";
import type { SelectedTag } from "@/components/client/Tag/TagInput";
import { TagInput } from "@/components/client/Tag/TagInput";
import { CategoryInput } from "@/components/client/Category/CategoryInput";
import MediaSelector from "@/components/client/MediaSelector";
import { TiptapEditor, setEditorToast } from "./TiptapEditor";
import { LiveEditor } from "./LiveEditor";
import { createPost, updatePost } from "@/actions/post";
import { useNavigateWithTransition } from "@/components/Link";
import { TableToolbar } from "./TableToolbar";
import { TableSizePicker } from "./TableSizePicker";
import { ListToolbar } from "./ListToolbar";
import { LinkPopover } from "./LinkPopover";
import { LinkToolbar } from "./LinkToolbar";
import { ImageToolbar } from "./ImageToolbar";
import { CodeBlockToolbar } from "./CodeBlockToolbar";
import { MathDialog } from "./MathDialog";
import { useToast } from "@/ui/Toast";
import {
  loadEditorContent,
  clearEditorContent,
  saveEditorContent,
} from "@/lib/client/editor-persistence";
import type { Editor as TiptapEditorType } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { editor } from "monaco-editor";
import {
  createAdapterManager,
  type AdapterManager,
  type EditorState as AdapterEditorState,
} from "./adapters";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";

export default function Editor({
  content,
  storageKey = "new",
  initialData,
  isEditMode = false,
}: {
  content?: string;
  storageKey?: string;
  initialData?: {
    title?: string;
    slug?: string;
    excerpt?: string;
    status?: string;
    isPinned?: boolean;
    allowComments?: boolean;
    robotsIndex?: boolean;
    metaDescription?: string;
    metaKeywords?: string;
    featuredImage?: string;
    categories?: string[];
    tags?: string[];
    postMode?: "MARKDOWN" | "MDX";
  };
  isEditMode?: boolean;
}) {
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
  const navigate = useNavigateWithTransition();
  const hasLoadedFromStorage = useRef(false); // 标记是否已从storage加载
  const isInitialMount = useRef(true); // 标记是否是首次挂载

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

  // 初始化编辑器类型，从 localStorage 加载上次使用的编辑器类型（仅在客户端）
  const [editorType, setEditorType] = useState<string | number>(() => {
    // 检查是否在浏览器环境
    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem("editor");
        if (savedData) {
          const editorData = JSON.parse(savedData);
          const savedEditorType = editorData[storageKey]?.config?.editorType;
          if (savedEditorType) {
            return savedEditorType;
          }
        }
      } catch (error) {
        console.error("Failed to load editor type from localStorage:", error);
      }
    }

    // 如果 localStorage 中没有信息，根据文章的 postMode 来选择编辑器
    if (isEditMode && initialData?.postMode) {
      // MARKDOWN 模式使用可视化编辑器，MDX 模式使用 MDX 编辑器
      return initialData.postMode === "MARKDOWN" ? "visual" : "mdx";
    }

    return "visual"; // 默认值
  });

  // 设置详细信息对话框状态
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "draft" | "publish" | null
  >(null);
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  // 文章详细信息表单
  const [detailsForm, setDetailsForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    status: "DRAFT",
    isPinned: false,
    allowComments: true,
    robotsIndex: true,
    metaDescription: "",
    metaKeywords: "",
    featuredImage: "",
    category: null as string | null, // 单个分类
    tags: [] as SelectedTag[], // 使用 SelectedTag 类型
  });

  // 编辑器类型切换时重置加载标记
  useEffect(() => {
    hasLoadedFromStorage.current = false;
  }, [editorType]);

  // 初始化表单数据
  useEffect(() => {
    if (initialData) {
      setDetailsForm((prev) => ({
        ...prev,
        ...initialData,
        // 将 string[] categories 转换为 string | null
        category: initialData.categories?.[0] || null,
        // 将 string[] tags 转换为 SelectedTag[]
        tags: initialData.tags
          ? initialData.tags.map((name) => ({
              name,
              slug: name.toLowerCase().replace(/\s+/g, "-"),
              isNew: false,
            }))
          : [],
      }));
    }
  }, [initialData]);

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

  // 初始化适配器管理器
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
            // 更新工具栏相关状态
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
      adapterManagerRef.current?.destroy();
      adapterManagerRef.current = null;
    };
  }, [storageKey]);

  // 在组件挂载时检查localStorage中是否有保存的内容（只执行一次）
  useEffect(() => {
    // 如果是Markdown或MDX编辑器模式
    if (editorType === "markdown" || editorType === "mdx") {
      if (hasLoadedFromStorage.current) return;

      const savedData = loadEditorContent(storageKey);

      if (savedData?.content) {
        setMarkdownContent(savedData.content);
        hasLoadedFromStorage.current = true;

        // 加载保存的配置
        if (savedData.config) {
          setDetailsForm((prev) => ({
            ...prev,
            ...savedData.config,
          }));
        }

        // 只在首次挂载时显示toast
        if (isInitialMount.current) {
          const lastUpdated = new Date(savedData.lastUpdatedAt).toLocaleString(
            "zh-CN",
          );

          toast.info("已加载草稿", `上次保存于 ${lastUpdated}`, 10000, {
            label: "撤销",
            onClick: () => {
              clearEditorContent(storageKey);
              setMarkdownContent(content || "");
              toast.success("已撤销", "草稿已删除");
            },
          });
          isInitialMount.current = false;
        }
      } else {
        setMarkdownContent(content || "");
      }
      return;
    }

    // Tiptap编辑器模式
    // 必须等待编辑器准备好
    if (!editor) return;

    // 如果已经加载过，直接返回
    if (hasLoadedFromStorage.current) return;

    const savedData = loadEditorContent(storageKey);

    console.log("检查localStorage:", savedData);

    if (savedData?.content) {
      // 如果有保存的内容，使用它
      const savedContent = savedData.content;
      console.log("加载草稿内容:", savedContent);

      setInitialContent(savedContent);
      hasLoadedFromStorage.current = true;

      // 加载保存的配置
      if (savedData.config) {
        setDetailsForm((prev) => ({
          ...prev,
          ...savedData.config,
        }));
      }

      // 使用Markdown扩展的parse方法将Markdown转换为JSON
      // @ts-expect-error - markdown.parse方法可能没有类型定义
      const json = editor.markdown.parse(savedContent);
      editor.commands.setContent(json);

      // 只在首次挂载时显示toast
      if (isInitialMount.current) {
        const lastUpdated = new Date(savedData.lastUpdatedAt).toLocaleString(
          "zh-CN",
        );

        toast.info("已加载草稿", `上次保存于 ${lastUpdated}`, 10000, {
          label: "撤销",
          onClick: () => {
            clearEditorContent(storageKey);
            setInitialContent(content);

            // 清空编辑器内容，使用原始content
            if (editor) {
              editor.commands.setContent(content || "");
            }

            toast.success("已撤销", "草稿已删除");
          },
        });
        isInitialMount.current = false;
      }
    } else {
      // 使用传入的content
      console.log("没有草稿，使用默认内容");
      setInitialContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editorType]); // 依赖editor和editorType，确保编辑器准备好后加载内容

  // 监控 markdownContent 变化并同步到 Monaco
  useEffect(() => {
    if (
      monacoEditor &&
      markdownContent &&
      (editorType === "markdown" || editorType === "mdx")
    ) {
      const currentMonacoContent = monacoEditor.getValue();
      if (currentMonacoContent !== markdownContent) {
        monacoEditor.setValue(markdownContent);
        monacoEditor.setPosition({ lineNumber: 1, column: 1 });
      }
    }
  }, [markdownContent, monacoEditor, editorType]);

  // 从编辑器内容中提取第一个 H1 标题
  const extractTitleFromEditor = useCallback(
    (editorInstance: TiptapEditorType) => {
      const json = editorInstance.getJSON();
      if (json.content) {
        for (const node of json.content) {
          if (node.type === "heading" && node.attrs?.level === 1) {
            // 提取文本内容
            const text =
              (node.content as Array<{ text?: string }> | undefined)
                ?.map((c) => c.text || "")
                .join("") || "";
            return text;
          }
        }
      }
      return "";
    },
    [],
  );

  // 从 Markdown 内容中提取第一个 H1 标题
  const extractTitleFromMarkdown = useCallback((content: string) => {
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return "";
  }, []);

  const handleEditorReady = useCallback(
    (editorInstance: TiptapEditorType) => {
      setEditor(editorInstance);

      // 注册到适配器管理器
      if (adapterManagerRef.current) {
        adapterManagerRef.current.registerTiptapEditor(editorInstance);
      }

      // 同步编辑器中的 H1 标题到表单
      const syncTitleFromEditor = () => {
        const title = extractTitleFromEditor(editorInstance);
        if (title) {
          setDetailsForm((prev) => {
            if (prev.title !== title) {
              return { ...prev, title };
            }
            return prev;
          });
        }
      };

      // 监听编辑器更新事件，同步标题
      editorInstance.on("update", () => {
        syncTitleFromEditor();
      });

      // 初始化时同步标题
      syncTitleFromEditor();
    },
    [extractTitleFromEditor],
  );

  const toggleFullscreen = async () => {
    const editorElement = document.getElementById("editor-container");
    if (!editorElement) return;

    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        await editorElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        // 退出全屏
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("全屏切换失败:", error);
    }
  };

  // 监听浏览器全屏状态变化(用户按 ESC 键退出全屏时)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // 工具栏按钮操作 - 通过适配器管理器执行
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

    // 获取当前位置的链接属性
    const attrs = editor.getAttributes("link");
    if (!attrs.href) {
      setIsLinkPopoverOpen(true);
      return;
    }

    // 查找链接的起始和结束位置
    let start = from;
    let end = from;

    // 向前搜索
    state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
      if (node.isText) {
        const marks = node.marks;
        const linkMarkInNode = marks.find(
          (m) => m.type === linkMark && m.attrs.href === attrs.href,
        );

        if (linkMarkInNode) {
          const nodeStart = pos;
          const nodeEnd = pos + node.nodeSize;

          // 检查当前选择是否在这个节点内
          if (from >= nodeStart && from <= nodeEnd) {
            start = nodeStart;
            end = nodeEnd;
            return false; // 停止遍历
          }
        }
      }
    });

    // 选中整个链接
    editor.chain().focus().setTextSelection({ from: start, to: end }).run();

    // 延迟打开对话框,确保状态更新
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

    // 过滤掉空的 URL
    const validUrls = urls.filter((u) => u && u.trim());

    if (validUrls.length === 0) {
      console.warn("No valid image URLs provided");
      return;
    }

    console.log("Inserting images:", validUrls);

    // 使用批量插入命令，一次性插入所有图片
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

  // 打开数学公式对话框（插入新公式）
  const handleMath = () => {
    setMathDialogMode("insert");
    setMathDialogLatex("");
    setMathDialogType("inline");
    setMathDialogPosition(undefined);
    setIsMathDialogOpen(true);
  };

  // 数学公式节点点击处理（编辑现有公式）
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

  // 设置当前列的对齐方式（在表格内时）
  const setColumnAlignment = (align: "left" | "center" | "right") => {
    if (!editor) return;

    const { state, view } = editor;
    const { selection } = state;

    // 保存当前光标位置
    const currentPos = selection.from;

    // 检查是否是单元格选择（CellSelection）
    const isCellSelection = selection.constructor.name === "CellSelection";

    // 多单元格选择时不执行对齐操作
    if (isCellSelection) {
      return;
    }

    // 单个单元格：更新整列
    const { $anchor } = selection;

    // 获取当前单元格的深度和列索引
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

    // 获取表格节点和当前行
    const tableDepth = cellDepth - 2;
    const table = $anchor.node(tableDepth);

    // 计算当前列的索引
    let colIndex = 0;
    for (let i = 0; i < $anchor.index(cellDepth - 1); i++) {
      colIndex++;
    }

    // 创建事务来更新所有行中该列的单元格
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

            // 创建新的单元格节点，更新 textAlign 属性
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
      // 恢复光标位置
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
    // 如果在表格内，设置列对齐
    if (editorState.isTable) {
      setColumnAlignment("left");
    } else {
      adapterManagerRef.current?.executeCommand("alignLeft");
    }
  };

  const handleAlignCenter = () => {
    // 如果在表格内，设置列对齐
    if (editorState.isTable) {
      setColumnAlignment("center");
    } else {
      adapterManagerRef.current?.executeCommand("alignCenter");
    }
  };

  const handleAlignRight = () => {
    // 如果在表格内，设置列对齐
    if (editorState.isTable) {
      setColumnAlignment("right");
    } else {
      adapterManagerRef.current?.executeCommand("alignRight");
    }
  };

  // 打开设置详细信息对话框
  const openDetailsDialog = () => {
    setDetailsDialogOpen(true);
  };

  // 关闭设置详细信息对话框
  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
  };

  // 更新编辑器中的第一个 H1 标题
  const updateEditorTitle = useCallback(
    (newTitle: string) => {
      if (editorType === "visual" && editor) {
        const json = editor.getJSON();
        if (json.content) {
          let found = false;
          for (let i = 0; i < json.content.length; i++) {
            const node = json.content[i];
            if (node && node.type === "heading" && node.attrs?.level === 1) {
              // 更新现有的 H1
              json.content[i] = {
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: newTitle }],
              } as unknown as typeof node;
              found = true;
              break;
            }
          }
          if (!found && newTitle) {
            // 如果没有 H1，在开头插入一个
            json.content.unshift({
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: newTitle }],
            } as unknown as (typeof json.content)[0]);
          }
          editor.commands.setContent(json);
        }
      } else if (
        (editorType === "markdown" || editorType === "mdx") &&
        monacoEditor
      ) {
        const content = markdownContent;
        const lines = content.split("\n");
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line && line.match(/^#\s+/)) {
            lines[i] = `# ${newTitle}`;
            found = true;
            break;
          }
        }
        if (!found && newTitle) {
          lines.unshift(`# ${newTitle}`, "");
        }
        const newContent = lines.join("\n");
        setMarkdownContent(newContent);
        monacoEditor.setValue(newContent);
      }
    },
    [editor, editorType, monacoEditor, markdownContent],
  );

  // 处理表单字段变化
  const handleDetailsFieldChange = (
    field: string,
    value: string | boolean | number[] | SelectedTag[] | string | null,
  ) => {
    setDetailsForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // 如果修改的是标题，同步到编辑器
    if (field === "title" && typeof value === "string") {
      updateEditorTitle(value);
    }
  };

  // 保存详细信息配置
  const handleSaveDetails = async () => {
    // 验证必填字段
    if (!detailsForm.title.trim()) {
      toast.error("请填写文章标题");
      return;
    }

    setIsSubmitting(true);
    try {
      // 获取当前编辑器内容（通过适配器）
      const currentContent = adapterManagerRef.current?.getContent() || "";

      // 保存到 localStorage
      saveEditorContent(
        currentContent,
        { ...detailsForm, editorType }, // 保存编辑器类型
        editorType !== "visual",
        storageKey,
      );

      toast.success("详细信息已保存");
      closeDetailsDialog();
    } catch (error) {
      console.error("保存详细信息失败:", error);
      toast.error("保存失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开确认对话框（保存为草稿/发布）
  const openConfirmDialog = (action: "draft" | "publish") => {
    setConfirmAction(action);
    setShowCommitInput(false);
    setCommitMessage("");
    setConfirmDialogOpen(true);
  };

  // 关闭确认对话框
  const closeConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setConfirmAction(null);
    setShowCommitInput(false);
    setCommitMessage("");
  };

  // 从确认对话框打开详细信息设置
  const openDetailsFromConfirm = () => {
    closeConfirmDialog();
    openDetailsDialog();
  };

  // 进入提交信息输入步骤
  const handleNextStep = () => {
    // 验证必填字段
    if (!detailsForm.title.trim()) {
      toast.error("请填写文章标题");
      return;
    }
    setShowCommitInput(true);
  };

  // 返回确认信息步骤
  const handleBackToConfirm = () => {
    setShowCommitInput(false);
  };

  // 最终保存/发布操作
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 先创建新的 tags（如果有）
      const newTags = detailsForm.tags.filter((tag) => tag.isNew);
      if (newTags.length > 0) {
        const accessToken = localStorage.getItem("access_token");
        const { createTag } = await import("@/actions/tag");

        // 并行创建所有新 tags
        await Promise.all(
          newTags.map(async (tag) => {
            try {
              await createTag({
                access_token: accessToken || undefined,
                name: tag.name,
                // slug 会自动从 name 生成
              });
            } catch (error) {
              console.error(`创建标签 "${tag.name}" 失败:`, error);
              // 即使创建失败也继续，因为可能是重复创建
            }
          }),
        );
      }

      // 获取当前编辑器内容（通过适配器，仅在客户端）
      let currentContent = "";
      if (typeof window !== "undefined") {
        try {
          // 优先从适配器获取内容
          currentContent = adapterManagerRef.current?.getContent() || "";

          // 如果适配器没有内容，尝试从 localStorage 读取
          if (!currentContent) {
            currentContent =
              JSON.parse(localStorage.getItem("editor") || "{}")[storageKey]
                ?.content || "";
          }
        } catch (error) {
          console.error("Failed to get editor content:", error);
        }
      }

      // 确定编辑器模式：visual 和 markdown 都视为 MARKDOWN，mdx 视为 MDX
      const postMode: "MARKDOWN" | "MDX" =
        editorType === "visual" || editorType === "markdown"
          ? "MARKDOWN"
          : "MDX";

      let result;

      // 将 SelectedTag[] 转换为 string[]（只传递名称）
      const tagNames = detailsForm.tags.map((tag) => tag.name);

      if (isEditMode) {
        // 编辑模式：使用详细信息中设置的状态
        const status = detailsForm.status as "DRAFT" | "PUBLISHED" | "ARCHIVED";

        const updateData = {
          slug: storageKey, // 使用 storageKey 作为当前文章的 slug
          title: detailsForm.title,
          newSlug:
            detailsForm.slug !== storageKey ? detailsForm.slug : undefined,
          content: currentContent,
          excerpt: detailsForm.excerpt || undefined,
          featuredImage: detailsForm.featuredImage || undefined,
          status,
          isPinned: detailsForm.isPinned,
          allowComments: detailsForm.allowComments,
          metaDescription: detailsForm.metaDescription || undefined,
          metaKeywords: detailsForm.metaKeywords || undefined,
          robotsIndex: detailsForm.robotsIndex,
          categories: detailsForm.category ? [detailsForm.category] : undefined,
          tags: tagNames.length > 0 ? tagNames : undefined,
          commitMessage: commitMessage || undefined,
          postMode,
        };

        result = await updatePost(updateData);
      } else {
        // 新建模式：根据按钮类型决定状态
        const status = confirmAction === "publish" ? "PUBLISHED" : "DRAFT";

        const postData = {
          title: detailsForm.title,
          slug: detailsForm.slug,
          content: currentContent,
          excerpt: detailsForm.excerpt || undefined,
          featuredImage: detailsForm.featuredImage || undefined,
          status: status as "DRAFT" | "PUBLISHED",
          isPinned: detailsForm.isPinned,
          allowComments: detailsForm.allowComments,
          metaDescription: detailsForm.metaDescription || undefined,
          metaKeywords: detailsForm.metaKeywords || undefined,
          robotsIndex: detailsForm.robotsIndex,
          categories: detailsForm.category ? [detailsForm.category] : undefined,
          tags: tagNames.length > 0 ? tagNames : undefined,
          commitMessage: commitMessage || undefined,
          postMode,
        };

        result = await createPost(postData);
      }

      // 检查是否是 NextResponse
      let response;
      if (result instanceof Response) {
        response = await result.json();
      } else {
        response = result;
      }

      // 处理结果
      if (response.success) {
        if (isEditMode) {
          // 编辑模式：根据状态显示不同提示
          const statusText =
            detailsForm.status === "PUBLISHED"
              ? "已发布"
              : detailsForm.status === "ARCHIVED"
                ? "已归档"
                : "草稿";
          toast.success(
            `文章已保存为${statusText}`,
            commitMessage ? `提交信息：${commitMessage}` : undefined,
          );
        } else {
          // 新建模式：根据按钮类型显示不同提示
          toast.success(
            confirmAction === "publish" ? "文章已发布" : "草稿已保存",
            commitMessage ? `提交信息：${commitMessage}` : undefined,
          );
        }

        // 清除 localStorage 中的草稿
        clearEditorContent(storageKey);

        closeConfirmDialog();

        // 延迟导航，让用户看到成功提示
        setTimeout(() => {
          navigate("/admin/posts");
        }, 1000);
      } else {
        toast.error(response.message || "操作失败，请稍后重试");
      }
    } catch (error) {
      console.error("保存失败:", error);
      toast.error("操作失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 标题选项
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

  // 列表选项
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

  // 对齐选项
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

  // 工具栏按钮
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
      id="editor-container"
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

          {/* 不可见字符按钮 - 仅在可视化编辑器中可用 */}
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

          {/* 目录切换按钮 - 仅在可视化编辑器中可用 */}
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
              onEditorReady={handleEditorReady}
              className="h-full"
              showInvisibleChars={showInvisibleChars}
              showTableOfContents={showTableOfContents}
              enablePersistence={true}
              editorConfig={{
                ...detailsForm,
                editorType: String(editorType),
                isFullscreen,
                showTableOfContents,
              }}
              storageKey={storageKey}
              onMathClick={handleMathClick}
            />

            {/* 表格工具栏 */}
            {editor && (
              <TableToolbar editor={editor} isVisible={isTableToolbarVisible} />
            )}

            {/* 链接工具栏 */}
            {editor && (
              <LinkToolbar
                editor={editor}
                isVisible={isLinkToolbarVisible}
                linkUrl={currentLinkUrl}
                onEdit={handleEditLink}
              />
            )}

            {/* 图片工具栏 */}
            {editor && (
              <ImageToolbar
                editor={editor}
                isVisible={isImageToolbarVisible}
                imageSrc={currentImageSrc}
                imageAlt={currentImageAlt}
                onEditAlt={handleEditImageAlt}
              />
            )}

            {/* 代码块工具栏 */}
            {editor && (
              <CodeBlockToolbar
                editor={editor}
                isVisible={isCodeBlockToolbarVisible}
                currentLanguage={currentCodeBlockLanguage}
              />
            )}

            {/* 列表工具栏 */}
            {editor && <ListToolbar editor={editor} />}
          </>
        ) : (
          <LiveEditor
            content={markdownContent}
            onChange={(content) => {
              setMarkdownContent(content);

              // 同步标题到表单
              const title = extractTitleFromMarkdown(content);
              if (title) {
                setDetailsForm((prev) => {
                  if (prev.title !== title) {
                    return { ...prev, title };
                  }
                  return prev;
                });
              }

              // 保存到localStorage (Markdown模式,直接保存不转换)
              saveEditorContent(
                content,
                {
                  ...detailsForm,
                  editorType: String(editorType),
                  isFullscreen,
                  showTableOfContents,
                },
                true, // isMarkdown = true,直接保存Markdown
                storageKey,
              );
            }}
            mode={editorType === "mdx" ? "mdx" : "markdown"}
            onEditorReady={(monacoInstance) => {
              setMonacoEditor(monacoInstance);

              // 注册到适配器管理器
              if (adapterManagerRef.current) {
                if (editorType === "mdx") {
                  adapterManagerRef.current.registerMDXEditor(monacoInstance);
                } else {
                  adapterManagerRef.current.registerMarkdownEditor(
                    monacoInstance,
                  );
                }
              }

              // 强制同步内容到 Monaco
              if (markdownContent && markdownContent.trim()) {
                monacoInstance.setValue(markdownContent);
                monacoInstance.setPosition({ lineNumber: 1, column: 1 });
              } else {
                // 如果 markdownContent 为空，尝试从 localStorage 重新加载
                const savedData = loadEditorContent(storageKey);
                if (savedData?.content) {
                  monacoInstance.setValue(savedData.content);
                  monacoInstance.setPosition({ lineNumber: 1, column: 1 });
                  setMarkdownContent(savedData.content);
                }
              }

              // 初始化时同步标题
              const title = extractTitleFromMarkdown(markdownContent);
              if (title) {
                setDetailsForm((prev) => {
                  if (prev.title !== title) {
                    return { ...prev, title };
                  }
                  return prev;
                });
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
            onChange={setEditorType}
            options={[
              { value: "visual", label: "可视化编辑器" },
              { value: "markdown", label: "Markdown" },
              { value: "mdx", label: "MDX (Beta)" },
            ]}
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

        {/* 图片选择器 - 用于在编辑器中插入图片 */}
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

        {/* 右侧：操作按钮 */}
        <div className="flex gap-2">
          <Button
            label={isEditMode ? "更改详细信息" : "设置详细信息"}
            variant="ghost"
            size="sm"
            onClick={openDetailsDialog}
          />
          {isEditMode ? (
            <Button
              label="保存"
              variant="primary"
              size="sm"
              onClick={() => openConfirmDialog("draft")}
            />
          ) : (
            <>
              <Button
                label="保存为草稿"
                variant="ghost"
                size="sm"
                onClick={() => openConfirmDialog("draft")}
              />
              <Button
                label="发布"
                variant="primary"
                size="sm"
                onClick={() => openConfirmDialog("publish")}
              />
            </>
          )}
        </div>
      </GridItem>

      {/* 设置详细信息对话框 */}
      <Dialog
        open={detailsDialogOpen}
        onClose={closeDetailsDialog}
        title="文章详细信息"
        size="lg"
      >
        <div className="px-6 py-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              基本信息
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <Input
                label="标题"
                value={detailsForm.title}
                onChange={(e) =>
                  handleDetailsFieldChange("title", e.target.value)
                }
                required
                size="sm"
              />
              <Input
                label="Slug"
                value={detailsForm.slug}
                onChange={(e) =>
                  handleDetailsFieldChange("slug", e.target.value)
                }
                size="sm"
                helperText="URL 路径，例如：my-first-post。留空将从标题自动生成"
              />
              <Input
                label="摘要"
                value={detailsForm.excerpt}
                onChange={(e) =>
                  handleDetailsFieldChange("excerpt", e.target.value)
                }
                rows={3}
                size="sm"
              />
              <CategoryInput
                label="分类"
                value={detailsForm.category}
                onChange={(category) =>
                  handleDetailsFieldChange("category", category)
                }
                size="sm"
              />
              <TagInput
                label="标签"
                value={detailsForm.tags}
                onChange={(tags) => handleDetailsFieldChange("tags", tags)}
                helperText="输入关键词搜索现有标签，或直接创建新标签"
                size="sm"
              />
            </div>
          </div>

          {/* 发布设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              发布设置
            </h3>
            <div className="space-y-3">
              {isEditMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      文章状态
                    </label>
                    <Select
                      value={detailsForm.status}
                      onChange={(value) =>
                        handleDetailsFieldChange("status", String(value))
                      }
                      options={[
                        { value: "DRAFT", label: "草稿" },
                        { value: "PUBLISHED", label: "已发布" },
                        { value: "ARCHIVED", label: "已归档" },
                      ]}
                      size="sm"
                    />
                  </div>
                  <br />
                </>
              )}
              <Checkbox
                label="置顶文章"
                checked={detailsForm.isPinned}
                onChange={(e) =>
                  handleDetailsFieldChange("isPinned", e.target.checked)
                }
              />
              <br />
              <Checkbox
                label="允许评论"
                checked={detailsForm.allowComments}
                onChange={(e) =>
                  handleDetailsFieldChange("allowComments", e.target.checked)
                }
              />
            </div>
          </div>

          {/* SEO 设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              SEO 设置
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <Input
                label="SEO 描述"
                value={detailsForm.metaDescription}
                onChange={(e) =>
                  handleDetailsFieldChange("metaDescription", e.target.value)
                }
                rows={2}
                size="sm"
                helperText="留空则使用文章摘要"
              />
              <Input
                label="SEO 关键词"
                value={detailsForm.metaKeywords}
                onChange={(e) =>
                  handleDetailsFieldChange("metaKeywords", e.target.value)
                }
                size="sm"
                helperText="多个关键词用逗号分隔"
              />
              <Checkbox
                label="允许搜索引擎索引"
                checked={detailsForm.robotsIndex}
                onChange={(e) =>
                  handleDetailsFieldChange("robotsIndex", e.target.checked)
                }
              />
            </div>
          </div>

          {/* 特色图片 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              特色图片
            </h3>
            <MediaSelector
              label="特色图片"
              value={detailsForm.featuredImage}
              onChange={(url) =>
                handleDetailsFieldChange(
                  "featuredImage",
                  Array.isArray(url) ? url[0] || "" : url,
                )
              }
              helperText="选择或上传文章的特色图片，将显示在文章列表和详情页顶部"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeDetailsDialog}
              size="sm"
              disabled={isSubmitting}
            />
            <Button
              label="保存"
              variant="primary"
              onClick={handleSaveDetails}
              size="sm"
              loading={isSubmitting}
              loadingText="保存中..."
            />
          </div>
        </div>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={closeConfirmDialog}
        title={
          isEditMode
            ? "确认保存"
            : confirmAction === "publish"
              ? "确认发布"
              : "确认保存为草稿"
        }
        size="lg"
      >
        <AutoResizer>
          <div className="px-6 py-6">
            <AutoTransition duration={0.2}>
              {!showCommitInput ? (
                <div key="confirm-info" className="space-y-6">
                  {/* 确认信息展示 */}
                  <p className="text-sm text-muted-foreground mb-4">
                    请确认以下信息无误后继续。
                    <span className="text-error">标题</span>为必填项。
                  </p>

                  {/* 编辑器类型提示 */}
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      根据当前所选编辑器，内容将以{" "}
                      <span className="font-medium text-primary">
                        {editorType === "visual"
                          ? "Markdown"
                          : editorType === "markdown"
                            ? "Markdown"
                            : "MDX"}
                      </span>{" "}
                      模式保存。
                    </p>
                  </div>

                  {/* 基本信息 - 只读展示 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                      基本信息
                    </h3>
                    <div className="grid grid-cols-1 gap-4 bg-muted/20 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          标题 <span className="text-error">*</span>
                        </label>
                        <p
                          className={`text-sm ${detailsForm.title ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {detailsForm.title ||
                            `（未设置，请点击"${isEditMode ? "更改" : "设置"}详细信息"填写）`}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Slug
                        </label>
                        <p className="text-sm font-mono text-foreground/80">
                          {detailsForm.slug || "（未设置，将从标题自动生成）"}
                        </p>
                      </div>
                      {isEditMode && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            文章状态
                          </label>
                          <p className="text-sm text-foreground/80">
                            {detailsForm.status === "DRAFT"
                              ? "草稿"
                              : detailsForm.status === "PUBLISHED"
                                ? "已发布"
                                : "已归档"}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          摘要
                        </label>
                        <p className="text-sm text-foreground/80">
                          {detailsForm.excerpt || "（未设置）"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          分类
                        </label>
                        <p className="text-sm text-foreground/80">
                          {detailsForm.category ||
                            "（未设置，将分配到「未分类」）"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          标签
                        </label>
                        <p className="text-sm text-foreground/80">
                          {detailsForm.tags.length > 0
                            ? detailsForm.tags.map((tag) => tag.name).join("、")
                            : "（未设置）"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 发布设置 - 只读展示 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                      发布设置
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          状态
                        </label>
                        <p className="text-sm text-foreground/80">
                          {confirmAction === "publish"
                            ? "已发布"
                            : detailsForm.status === "PUBLISHED"
                              ? "已发布"
                              : detailsForm.status === "DRAFT"
                                ? "草稿"
                                : "已归档"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          置顶
                        </label>
                        <p className="text-sm text-foreground/80">
                          {detailsForm.isPinned ? "是" : "否"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          允许评论
                        </label>
                        <p className="text-sm text-foreground/80">
                          {detailsForm.allowComments ? "是" : "否"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          搜索引擎索引
                        </label>
                        <p className="text-sm text-foreground/80">
                          {detailsForm.robotsIndex ? "允许" : "禁止"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SEO 设置 - 只读展示 */}
                  {(detailsForm.metaDescription ||
                    detailsForm.metaKeywords) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                        SEO 设置
                      </h3>
                      <div className="grid grid-cols-1 gap-4 bg-muted/20 p-4 rounded-lg">
                        {detailsForm.metaDescription && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              SEO 描述
                            </label>
                            <p className="text-sm text-foreground/80">
                              {detailsForm.metaDescription}
                            </p>
                          </div>
                        )}
                        {detailsForm.metaKeywords && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              SEO 关键词
                            </label>
                            <p className="text-sm text-foreground/80">
                              {detailsForm.metaKeywords}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 特色图片 - 只读展示 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                      特色图片
                    </h3>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      {detailsForm.featuredImage ? (
                        <div className="space-y-2 ">
                          <img
                            src={detailsForm.featuredImage}
                            alt="特色图片预览"
                            className="w-full max-h-[20em] rounded-md object-cover"
                          />
                          <p className="text-xs text-foreground/60 break-all">
                            {detailsForm.featuredImage}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          （未设置）
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-between gap-4 pt-4 border-t border-foreground/10">
                    <Button
                      label="取消"
                      variant="ghost"
                      onClick={closeConfirmDialog}
                      size="sm"
                      disabled={isSubmitting}
                    />
                    <div className="flex gap-2">
                      <Button
                        label={isEditMode ? "更改详细信息" : "设置详细信息"}
                        variant="ghost"
                        onClick={openDetailsFromConfirm}
                        size="sm"
                        disabled={isSubmitting}
                      />
                      <Button
                        label="下一步"
                        variant="primary"
                        onClick={handleNextStep}
                        size="sm"
                        disabled={isSubmitting || !detailsForm.title.trim()}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div key="commit-input" className="space-y-6">
                  {/* 提交信息输入 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                      提交信息
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      添加提交信息（可选）
                    </p>
                    <Input
                      label="提交信息（可选）"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      rows={3}
                      size="sm"
                      helperText="提交信息将帮助您追踪文章的修改历史"
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-between gap-4 pt-4 border-t border-foreground/10">
                    <Button
                      label="上一步"
                      variant="ghost"
                      onClick={handleBackToConfirm}
                      size="sm"
                      disabled={isSubmitting}
                    />
                    <Button
                      label={
                        isEditMode
                          ? "保存"
                          : confirmAction === "publish"
                            ? "发布"
                            : "保存为草稿"
                      }
                      variant="primary"
                      onClick={handleFinalSubmit}
                      size="sm"
                      loading={isSubmitting}
                      loadingText={
                        isEditMode
                          ? "保存中..."
                          : confirmAction === "publish"
                            ? "发布中..."
                            : "保存中..."
                      }
                    />
                  </div>
                </div>
              )}
            </AutoTransition>
          </div>
        </AutoResizer>
      </Dialog>
    </RowGrid>
  );
}
