"use client";

import { createArray } from "@/lib/client/createArray";
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
} from "@remixicon/react";
import { Toggle } from "@/ui/Toggle";
import { Dropdown, DropdownOption } from "@/ui/Dropdown";
import { useState, useCallback, useEffect, useRef } from "react";
import { Tooltip } from "@/ui/Tooltip";
import { Select } from "@/ui/Select";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Checkbox } from "@/ui/Checkbox";
import { TagInput, SelectedTag } from "@/components/client/Tag/TagInput";
import { CategoryInput } from "@/components/client/Category/CategoryInput";
import MediaSelector from "@/components/client/MediaSelector";
import { TiptapEditor } from "./TiptapEditor";
import { MarkdownEditor } from "./MarkdownEditor";
import { createPost, updatePost } from "@/actions/post";
import { useNavigateWithTransition } from "@/components/Link";
import { TableToolbar } from "./TableToolbar";
import { TableSizePicker } from "./TableSizePicker";
import { TableOfContents } from "./TableOfContents";
import { ListToolbar } from "./ListToolbar";
import { LinkPopover } from "./LinkPopover";
import { LinkToolbar } from "./LinkToolbar";
import { CodeBlockToolbar } from "./CodeBlockToolbar";
import { useToast } from "@/ui/Toast";
import {
  loadEditorContent,
  clearEditorContent,
  saveEditorContent,
} from "@/lib/client/editorPersistence";
import type { Editor as TiptapEditorType } from "@tiptap/react";
import type { editor } from "monaco-editor";
import * as monacoHelpers from "./MonacoHelpers";
import CMSImage from "@/components/CMSImage";

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
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isLinkToolbarVisible, setIsLinkToolbarVisible] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState("");
  const [isCodeBlockToolbarVisible, setIsCodeBlockToolbarVisible] =
    useState(false);
  const [currentCodeBlockLanguage, setCurrentCodeBlockLanguage] = useState("");
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);

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
  const [editorState, setEditorState] = useState({
    isBold: false,
    isItalic: false,
    isStrike: false,
    isUnderline: false,
    isHighlight: false,
    isCode: false,
    isSuperscript: false,
    isSubscript: false,
  });

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

      // 初始化状态
      const updateEditorState = () => {
        setEditorState({
          isBold: editorInstance.isActive("bold"),
          isItalic: editorInstance.isActive("italic"),
          isStrike: editorInstance.isActive("strike"),
          isUnderline: editorInstance.isActive("underline"),
          isHighlight: editorInstance.isActive("highlight"),
          isCode: editorInstance.isActive("code"),
          isSuperscript: editorInstance.isActive("superscript"),
          isSubscript: editorInstance.isActive("subscript"),
        });

        // 检查是否在表格内
        setIsTableToolbarVisible(editorInstance.isActive("table"));

        // 检查是否在链接上
        const isLink = editorInstance.isActive("link");
        setIsLinkToolbarVisible(isLink);
        if (isLink) {
          const attrs = editorInstance.getAttributes("link");
          setCurrentLinkUrl(attrs.href || "");
        } else {
          setCurrentLinkUrl("");
        }

        // 检查是否在代码块内
        const isCodeBlock = editorInstance.isActive("codeBlock");
        setIsCodeBlockToolbarVisible(isCodeBlock);
        if (isCodeBlock) {
          const attrs = editorInstance.getAttributes("codeBlock");
          setCurrentCodeBlockLanguage(attrs.language || "");
        } else {
          setCurrentCodeBlockLanguage("");
        }
      };

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

      // 监听编辑器更新事件，实时更新按钮状态
      editorInstance.on("selectionUpdate", updateEditorState);
      editorInstance.on("update", () => {
        updateEditorState();
        syncTitleFromEditor();
      });
      editorInstance.on("transaction", updateEditorState);

      // 初始化状态
      updateEditorState();
      // 初始化时同步标题
      syncTitleFromEditor();
    },
    [extractTitleFromEditor],
  );

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 更新编辑器状态的辅助函数
  const updateState = () => {
    if (!editor) return;
    setEditorState({
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isStrike: editor.isActive("strike"),
      isUnderline: editor.isActive("underline"),
      isHighlight: editor.isActive("highlight"),
      isCode: editor.isActive("code"),
      isSuperscript: editor.isActive("superscript"),
      isSubscript: editor.isActive("subscript"),
    });

    // 检查是否在表格内
    setIsTableToolbarVisible(editor.isActive("table"));

    // 检查是否在链接上
    const isLink = editor.isActive("link");
    setIsLinkToolbarVisible(isLink);
    if (isLink) {
      const attrs = editor.getAttributes("link");
      setCurrentLinkUrl(attrs.href || "");
    } else {
      setCurrentLinkUrl("");
    }

    // 检查是否在代码块内
    const isCodeBlock = editor.isActive("codeBlock");
    setIsCodeBlockToolbarVisible(isCodeBlock);
    if (isCodeBlock) {
      const attrs = editor.getAttributes("codeBlock");
      setCurrentCodeBlockLanguage(attrs.language || "");
    } else {
      setCurrentCodeBlockLanguage("");
    }
  };

  // 工具栏按钮操作
  const handleUndo = () => {
    if (editorType === "visual") {
      editor?.chain().focus().undo().run();
    } else if (monacoEditor) {
      monacoEditor.trigger("", "undo", null);
    }
  };
  const handleRedo = () => {
    if (editorType === "visual") {
      editor?.chain().focus().redo().run();
    } else if (monacoEditor) {
      monacoEditor.trigger("", "redo", null);
    }
  };
  const handleBold = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleBold().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "**");
    }
  };
  const handleItalic = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleItalic().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "*");
    }
  };
  const handleStrike = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleStrike().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "~~");
    }
  };
  const handleUnderline = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleUnderline().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "<u>", "</u>");
    }
  };
  const handleHighlight = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleHighlight().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "<mark>", "</mark>");
    }
  };
  const handleBlockquote = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleBlockquote().run();
    } else if (monacoEditor) {
      monacoHelpers.toggleLinePrefix(monacoEditor, "> ");
    }
  };
  const handleCode = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleCode().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "`");
    }
  };
  const handleCodeBlock = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleCodeBlock().run();
    } else if (monacoEditor) {
      monacoHelpers.insertCodeBlock(monacoEditor);
    }
  };

  const handleInsertTable = (rows: number, cols: number) => {
    if (editorType === "visual") {
      editor
        ?.chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: rows > 1 })
        .run();
    } else if (monacoEditor) {
      monacoHelpers.insertTable(monacoEditor, rows, cols);
    }
  };

  const handleLinkSubmit = (text: string, url: string) => {
    if (editorType === "visual") {
      if (!editor) return;

      const isEditingExistingLink = editor.isActive("link");

      if (isEditingExistingLink) {
        // 编辑现有链接
        if (text) {
          // 如果提供了新文字，需要替换整个链接内容
          editor
            .chain()
            .focus()
            .deleteSelection() // 删除当前选中的内容（如果有）
            .insertContent({
              type: "text",
              marks: [{ type: "link", attrs: { href: url } }],
              text: text,
            })
            .run();
        } else {
          // 只修改URL，保持文字不变
          editor.chain().focus().setLink({ href: url }).run();
        }
      } else {
        // 创建新链接
        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (text) {
          // 如果提供了文字，插入新链接
          editor
            .chain()
            .focus()
            .insertContent({
              type: "text",
              marks: [{ type: "link", attrs: { href: url } }],
              text: text,
            })
            .run();
        } else if (hasSelection) {
          // 如果有选中文字但没有提供新文字，则给选中的文字添加链接
          editor.chain().focus().setLink({ href: url }).run();
        } else {
          // 如果没有提供文字也没有选中文字，使用 URL 作为显示文字
          editor
            .chain()
            .focus()
            .insertContent({
              type: "text",
              marks: [{ type: "link", attrs: { href: url } }],
              text: url,
            })
            .run();
        }
      }
    } else if (monacoEditor) {
      // Markdown/MDX 模式
      monacoHelpers.insertLink(monacoEditor, url, text);
    }
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
  const handleImage = () => {
    setIsImageSelectorOpen(true);
  };

  const handleImageSelect = (url: string | string[]) => {
    if (!url) return;

    const urls = Array.isArray(url) ? url : [url];

    if (editorType === "visual" && editor) {
      // 在可视化编辑器中批量插入图片
      // 构建要插入的内容数组
      const content = urls.flatMap((imageUrl) => [
        {
          type: "image",
          attrs: {
            src: imageUrl,
          },
        },
        {
          type: "paragraph",
        },
      ]);

      // 一次性插入所有内容
      editor.chain().focus().insertContent(content).run();
    } else if (monacoEditor) {
      // 在 Markdown/MDX 编辑器中批量插入图片
      urls.forEach((imageUrl) => {
        monacoHelpers.insertImage(monacoEditor, imageUrl, "图片");
      });
    }

    setIsImageSelectorOpen(false);
  };
  const handleHorizontalRule = () => {
    if (editorType === "visual") {
      editor?.chain().focus().setHorizontalRule().run();
    } else if (monacoEditor) {
      monacoHelpers.insertHorizontalRule(monacoEditor);
    }
  };
  const handleSuperscript = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleSuperscript().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "<sup>", "</sup>");
    }
  };
  const handleSubscript = () => {
    if (editorType === "visual") {
      editor?.chain().focus().toggleSubscript().run();
      setTimeout(updateState, 0);
    } else if (monacoEditor) {
      monacoHelpers.wrapSelection(monacoEditor, "<sub>", "</sub>");
    }
  };

  const toggleInvisibleChars = () => {
    setShowInvisibleChars(!showInvisibleChars);
  };

  const handleAlignLeft = () => {
    if (editorType === "visual") {
      editor?.chain().focus().setTextAlign("left").run();
    } else if (monacoEditor) {
      monacoHelpers.setTextAlign(monacoEditor, "left");
    }
  };

  const handleAlignCenter = () => {
    if (editorType === "visual") {
      editor?.chain().focus().setTextAlign("center").run();
    } else if (monacoEditor) {
      monacoHelpers.setTextAlign(monacoEditor, "center");
    }
  };

  const handleAlignRight = () => {
    if (editorType === "visual") {
      editor?.chain().focus().setTextAlign("right").run();
    } else if (monacoEditor) {
      monacoHelpers.setTextAlign(monacoEditor, "right");
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
      // 获取当前编辑器内容
      let currentContent = "";
      if (editorType === "visual" && editor) {
        currentContent = editor.getHTML();
      } else if (editorType === "markdown" || editorType === "mdx") {
        currentContent = markdownContent;
      }

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

      // 获取当前编辑器内容（仅在客户端）
      let currentContent = "";
      if (typeof window !== "undefined") {
        try {
          currentContent =
            JSON.parse(localStorage.getItem("editor") || "{}")[storageKey]
              ?.content || "";
        } catch (error) {
          console.error("Failed to parse localStorage data:", error);
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
        if (editorType === "visual") {
          editor?.chain().focus().toggleHeading({ level: 1 }).run();
        } else if (monacoEditor) {
          monacoHelpers.setHeading(monacoEditor, 1);
        }
      },
    },
    {
      value: "h2",
      label: "标题 2",
      icon: <RiH2 size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleHeading({ level: 2 }).run();
        } else if (monacoEditor) {
          monacoHelpers.setHeading(monacoEditor, 2);
        }
      },
    },
    {
      value: "h3",
      label: "标题 3",
      icon: <RiH3 size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleHeading({ level: 3 }).run();
        } else if (monacoEditor) {
          monacoHelpers.setHeading(monacoEditor, 3);
        }
      },
    },
    {
      value: "h4",
      label: "标题 4",
      icon: <RiH4 size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleHeading({ level: 4 }).run();
        } else if (monacoEditor) {
          monacoHelpers.setHeading(monacoEditor, 4);
        }
      },
    },
    {
      value: "h5",
      label: "标题 5",
      icon: <RiH5 size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleHeading({ level: 5 }).run();
        } else if (monacoEditor) {
          monacoHelpers.setHeading(monacoEditor, 5);
        }
      },
    },
    {
      value: "h6",
      label: "标题 6",
      icon: <RiH6 size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleHeading({ level: 6 }).run();
        } else if (monacoEditor) {
          monacoHelpers.setHeading(monacoEditor, 6);
        }
      },
    },
  ];

  // 列表选项
  const listOptions: DropdownOption[] = [
    {
      value: "unordered",
      label: "无序列表",
      icon: <RiListUnordered size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleBulletList().run();
        } else if (monacoEditor) {
          monacoHelpers.toggleLinePrefix(monacoEditor, "- ");
        }
      },
    },
    {
      value: "ordered",
      label: "有序列表",
      icon: <RiListOrdered size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleOrderedList().run();
        } else if (monacoEditor) {
          monacoHelpers.toggleLinePrefix(monacoEditor, "1. ");
        }
      },
    },
    {
      value: "task",
      label: "待办事项",
      icon: <RiListCheck2 size="1.2em" />,
      onClick: () => {
        if (editorType === "visual") {
          editor?.chain().focus().toggleTaskList().run();
        } else if (monacoEditor) {
          monacoHelpers.toggleLinePrefix(monacoEditor, "- [ ] ");
        }
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
    },
    {
      value: "center",
      label: "居中对齐",
      icon: <RiAlignCenter size="1.2em" />,
      onClick: handleAlignCenter,
    },
    {
      value: "right",
      label: "右对齐",
      icon: <RiAlignRight size="1.2em" />,
      onClick: handleAlignRight,
    },
  ];

  // 工具栏按钮
  const toolbarButtons = [
    {
      icon: <RiArrowGoBackLine size="1.2em" />,
      action: handleUndo,
      name: "撤销",
    },
    {
      icon: <RiArrowGoForwardLine size="1.2em" />,
      action: handleRedo,
      name: "取消撤销",
    },
  ];

  const formattingButtons = [
    {
      icon: <RiBold size="1.2em" />,
      action: handleBold,
      name: "加粗",
      value: "bold",
      isActive: editorState.isBold,
    },
    {
      icon: <RiItalic size="1.2em" />,
      action: handleItalic,
      name: "斜体",
      value: "italic",
      isActive: editorState.isItalic,
    },
    {
      icon: <RiStrikethrough size="1.2em" />,
      action: handleStrike,
      name: "删除线",
      value: "strikethrough",
      isActive: editorState.isStrike,
    },
    {
      icon: <RiUnderline size="1.2em" />,
      action: handleUnderline,
      name: "下划线",
      value: "underline",
      isActive: editorState.isUnderline,
    },
    {
      icon: <RiMarkPenLine size="1.2em" />,
      action: handleHighlight,
      name: "高亮",
      value: "highlight",
      isActive: editorState.isHighlight,
    },
  ];

  const blockButtons = [
    {
      icon: <RiDoubleQuotesL size="1.2em" />,
      action: handleBlockquote,
      name: "引用",
      isActive: editor?.isActive("blockquote") || false,
    },
    {
      icon: <RiCodeLine size="1.2em" />,
      action: handleCode,
      name: "行内代码",
      value: "code",
      isActive: editorState.isCode,
    },
    {
      icon: <RiCodeSSlashLine size="1.2em" />,
      action: handleCodeBlock,
      name: "代码块",
      isActive: editor?.isActive("codeBlock") || false,
    },
  ];

  const insertButtons = [
    {
      icon: <RiImageAddLine size="1.2em" />,
      action: handleImage,
      name: "插入图片",
    },
    {
      icon: <RiSeparator size="1.2em" />,
      action: handleHorizontalRule,
      name: "分隔线",
    },
    {
      icon: <RiSuperscript size="1.2em" />,
      action: handleSuperscript,
      name: "上标",
      value: "superscript",
      isActive: editorState.isSuperscript,
    },
    {
      icon: <RiSubscript size="1.2em" />,
      action: handleSubscript,
      name: "下标",
      value: "subscript",
      isActive: editorState.isSubscript,
    },
  ];

  return (
    <RowGrid className="w-full max-h-[100vh]" full>
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
          <Tooltip content="标题">
            <Dropdown
              trigger={
                <div className="inline-flex items-center justify-center gap-0 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2">
                  <RiHeading size="1.2em" />
                </div>
              }
              options={headingOptions}
            />
          </Tooltip>

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
          <Tooltip content="对齐">
            <Dropdown
              trigger={
                <div className="inline-flex items-center justify-center gap-0 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2">
                  <RiAlignLeft size="1.2em" />
                </div>
              }
              options={alignOptions}
            />
          </Tooltip>

          <div className="w-px h-6 bg-foreground/20" />

          {/* 列表下拉菜单 */}
          <Tooltip content="列表">
            <Dropdown
              trigger={
                <div className="inline-flex items-center justify-center gap-0 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2">
                  <RiListUnordered size="1.2em" />
                </div>
              }
              options={listOptions}
            />
          </Tooltip>

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
        className="overflow-hidden bg-background relative"
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
              enablePersistence={true}
              editorConfig={{
                ...detailsForm,
                editorType: String(editorType),
                isFullscreen,
                showTableOfContents,
              }}
              storageKey={storageKey}
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

            {/* 目录 - 浮动在右侧 */}
            {showTableOfContents && (
              <div className="absolute top-0 right-8 h-full w-64 pt-8 hidden xl:block">
                <div className="sticky top-8 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <TableOfContents editor={editor} />
                </div>
              </div>
            )}
          </>
        ) : (
          <MarkdownEditor
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
        className="flex px-10 items-center justify-between border-t border-foreground/10"
      >
        {/* 左侧：编辑器类型选择 + 字数统计 */}
        <div className="flex items-center gap-4">
          <Select
            value={editorType}
            onChange={setEditorType}
            options={[
              { value: "visual", label: "可视化编辑器" },
              { value: "markdown", label: "Markdown" },
              { value: "mdx", label: "MDX" },
            ]}
            size="sm"
          />
          <div className="text-sm text-foreground/60">
            {editor ? (
              <span>字符: {editor.storage.characterCount.characters()}</span>
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
        <div className="px-6 py-6 space-y-6">
          {!showCommitInput ? (
            <>
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
                      className={`text-sm ${detailsForm.title ? "text-foreground/80" : "text-muted-foreground italic"}`}
                    >
                      {detailsForm.title ||
                        `（未设置，请点击"${isEditMode ? "更改" : "设置"}详细信息"填写）`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Slug
                    </label>
                    <p
                      className={`text-sm font-mono ${detailsForm.slug ? "text-foreground/80" : "text-muted-foreground italic"}`}
                    >
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
                      {detailsForm.category || "（未设置，将分配到「未分类」）"}
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
              {(detailsForm.metaDescription || detailsForm.metaKeywords) && (
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
                    <div className="space-y-2">
                      <CMSImage
                        src={detailsForm.featuredImage}
                        alt="特色图片预览"
                        className="max-h-40 rounded-md object-cover"
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </Dialog>
    </RowGrid>
  );
}
