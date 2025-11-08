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
import { TiptapEditor } from "./TiptapEditor";
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
} from "@/lib/client/editorPersistence";
import type { Editor as TiptapEditorType } from "@tiptap/react";

export default function Editor({ content }: { content?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editor, setEditor] = useState<TiptapEditorType | null>(null);
  const [isTableToolbarVisible, setIsTableToolbarVisible] = useState(false);
  const [showInvisibleChars, setShowInvisibleChars] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [initialContent, setInitialContent] = useState<string | undefined>(
    content,
  );
  const toast = useToast();
  const hasLoadedFromStorage = useRef(false); // 标记是否已从storage加载
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isLinkToolbarVisible, setIsLinkToolbarVisible] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState("");
  const [isCodeBlockToolbarVisible, setIsCodeBlockToolbarVisible] =
    useState(false);
  const [currentCodeBlockLanguage, setCurrentCodeBlockLanguage] = useState("");
  const [editorType, setEditorType] = useState<string | number>("visual");

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
    // 必须等待编辑器准备好
    if (!editor) return;

    // 如果已经加载过，直接返回
    if (hasLoadedFromStorage.current) return;

    const savedData = loadEditorContent();

    console.log("检查localStorage:", savedData);

    if (savedData?.new?.content) {
      // 如果有保存的内容，使用它
      const savedContent = savedData.new.content;
      console.log("加载草稿内容:", savedContent);

      setInitialContent(savedContent);
      hasLoadedFromStorage.current = true;

      // 使用Markdown扩展的parse方法将Markdown转换为JSON
      // @ts-expect-error - markdown.parse方法可能没有类型定义
      const json = editor.markdown.parse(savedContent);
      editor.commands.setContent(json);

      // 显示Toast提示
      const lastUpdated = new Date(savedData.new.lastUpdatedAt).toLocaleString(
        "zh-CN",
      );

      toast.info("已加载草稿", `上次保存于 ${lastUpdated}`, 10000, {
        label: "撤销",
        onClick: () => {
          clearEditorContent();
          setInitialContent(content);

          // 清空编辑器内容，使用原始content
          if (editor) {
            editor.commands.setContent(content || "");
          }

          toast.success("已撤销", "草稿已删除");
        },
      });
    } else {
      // 使用传入的content
      console.log("没有草稿，使用默认内容");
      setInitialContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]); // 依赖editor，确保编辑器准备好后加载内容

  const handleEditorReady = useCallback((editorInstance: TiptapEditorType) => {
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

    // 监听编辑器更新事件，实时更新按钮状态
    editorInstance.on("selectionUpdate", updateEditorState);
    editorInstance.on("update", updateEditorState);
    editorInstance.on("transaction", updateEditorState);

    // 初始化状态
    updateEditorState();
  }, []);

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
    editor?.chain().focus().undo().run();
  };
  const handleRedo = () => {
    editor?.chain().focus().redo().run();
  };
  const handleBold = () => {
    editor?.chain().focus().toggleBold().run();
    setTimeout(updateState, 0);
  };
  const handleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
    setTimeout(updateState, 0);
  };
  const handleStrike = () => {
    editor?.chain().focus().toggleStrike().run();
    setTimeout(updateState, 0);
  };
  const handleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
    setTimeout(updateState, 0);
  };
  const handleHighlight = () => {
    editor?.chain().focus().toggleHighlight().run();
    setTimeout(updateState, 0);
  };
  const handleBlockquote = () => {
    editor?.chain().focus().toggleBlockquote().run();
  };
  const handleCode = () => {
    editor?.chain().focus().toggleCode().run();
    setTimeout(updateState, 0);
  };
  const handleCodeBlock = () => {
    editor?.chain().focus().toggleCodeBlock().run();
  };

  const handleInsertTable = (rows: number, cols: number) => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: rows > 1 })
      .run();
  };

  const handleLinkSubmit = (text: string, url: string) => {
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
    const url = window.prompt("输入图片地址:");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };
  const handleHorizontalRule = () => {
    editor?.chain().focus().setHorizontalRule().run();
  };
  const handleSuperscript = () => {
    editor?.chain().focus().toggleSuperscript().run();
    setTimeout(updateState, 0);
  };
  const handleSubscript = () => {
    editor?.chain().focus().toggleSubscript().run();
    setTimeout(updateState, 0);
  };

  const toggleInvisibleChars = () => {
    setShowInvisibleChars(!showInvisibleChars);
  };

  const handleAlignLeft = () => {
    editor?.chain().focus().setTextAlign("left").run();
  };

  const handleAlignCenter = () => {
    editor?.chain().focus().setTextAlign("center").run();
  };

  const handleAlignRight = () => {
    editor?.chain().focus().setTextAlign("right").run();
  };

  // 标题选项
  const headingOptions: DropdownOption[] = [
    {
      value: "h1",
      label: "标题 1",
      icon: <RiH1 size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      value: "h2",
      label: "标题 2",
      icon: <RiH2 size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      value: "h3",
      label: "标题 3",
      icon: <RiH3 size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      value: "h4",
      label: "标题 4",
      icon: <RiH4 size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      value: "h5",
      label: "标题 5",
      icon: <RiH5 size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 5 }).run(),
    },
    {
      value: "h6",
      label: "标题 6",
      icon: <RiH6 size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 6 }).run(),
    },
  ];

  // 列表选项
  const listOptions: DropdownOption[] = [
    {
      value: "unordered",
      label: "无序列表",
      icon: <RiListUnordered size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      value: "ordered",
      label: "有序列表",
      icon: <RiListOrdered size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      value: "task",
      label: "待办事项",
      icon: <RiListCheck2 size="1.2em" />,
      onClick: () => editor?.chain().focus().toggleTaskList().run(),
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
        {/* 撤销/重做按钮 */}
        <div className="flex gap-1">
          {toolbarButtons.map((button, index) => (
            <Tooltip key={index} content={button.name}>
              <Toggle size="sm" variant="default" onClick={button.action}>
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
              >
                {button.icon}
              </Toggle>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-6 bg-foreground/20" />

        {/* 不可见字符按钮 */}
        <Tooltip
          content={showInvisibleChars ? "隐藏不可见字符" : "显示不可见字符"}
        >
          <Toggle
            size="sm"
            variant="default"
            pressed={showInvisibleChars}
            onClick={toggleInvisibleChars}
          >
            {showInvisibleChars ? (
              <RiEyeOffLine size="1.2em" />
            ) : (
              <RiEyeLine size="1.2em" />
            )}
          </Toggle>
        </Tooltip>

        {/* 目录切换按钮 */}
        <Tooltip content={showTableOfContents ? "隐藏目录" : "显示目录"}>
          <Toggle
            size="sm"
            variant="default"
            pressed={showTableOfContents}
            onClick={() => setShowTableOfContents(!showTableOfContents)}
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
          >
            {isFullscreen ? (
              <RiFullscreenExitLine size="1.2em" />
            ) : (
              <RiFullscreenLine size="1.2em" />
            )}
          </Toggle>
        </Tooltip>
      </GridItem>
      <GridItem
        areas={createArray(2, 11)}
        className="overflow-hidden bg-background relative"
        height={1.5}
      >
        <TiptapEditor
          placeholder="开始编写你的内容..."
          content={initialContent}
          onEditorReady={handleEditorReady}
          className="h-full"
          showInvisibleChars={showInvisibleChars}
          enablePersistence={true}
          editorConfig={{
            editorType: String(editorType),
            isFullscreen,
            showTableOfContents,
          }}
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

        {/* 右侧：操作按钮 */}
        <div className="flex gap-2">
          <Button label="设置详细信息" variant="ghost" size="sm" />
          <Button label="保存为草稿" variant="ghost" size="sm" />
          <Button label="发布" variant="primary" size="sm" />
        </div>
      </GridItem>
    </RowGrid>
  );
}
