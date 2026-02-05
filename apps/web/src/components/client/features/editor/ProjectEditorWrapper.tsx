"use client";

import { useCallback, useEffect, useState } from "react";
import { RiGithubFill } from "@remixicon/react";
import { useRouter } from "next/navigation";

import {
  createProject,
  syncProjectsGithub,
  updateProject,
} from "@/actions/project";
import { CategoryInput } from "@/components/client/features/categories/CategoryInput";
import { EditorCore } from "@/components/client/features/editor/EditorCore";
import MediaSelector from "@/components/client/features/media/MediaSelector";
import type { SelectedTag } from "@/components/client/features/tags/TagInput";
import { TagInput } from "@/components/client/features/tags/TagInput";
import {
  clearEditorContent,
  loadEditorContent,
  saveEditorContent,
} from "@/lib/client/editor-persistence";
import type {
  EditorInitialData,
  EditorMode,
  StatusBarActionConfig,
} from "@/types/editor-config";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { useToast } from "@/ui/Toast";

/**
 * Project 表单数据类型
 */
interface ProjectFormData {
  title: string;
  slug: string;
  description: string;
  status: string;
  demoUrl: string;
  repoUrl: string;
  techStack: string[];
  repoPath: string;
  license: string;
  enableGithubSync: boolean;
  enableConentSync: boolean;
  featuredImages: string[];
  startedAt: string;
  category: string | null;
  tags: SelectedTag[];
}

/**
 * ProjectEditorWrapper Props
 */
interface ProjectEditorWrapperProps {
  // 编辑器基础配置
  content: string;
  storageKey: string;
  isEditMode?: boolean;
  initialData?: EditorInitialData;

  // 可用的编辑器模式
  availableModes?: EditorMode[];
  defaultMode?: EditorMode;

  // 成功后重定向路径
  successRedirectPath?: string;

  // GitHub 同步相关
  projectId?: number;
  accessToken?: string;
  enableGithubSyncAction?: boolean;
}

/**
 * 创建默认 Project 表单数据
 */
function createDefaultProjectFormData(): ProjectFormData {
  return {
    title: "",
    slug: "",
    description: "",
    status: "DRAFT",
    demoUrl: "",
    repoUrl: "",
    techStack: [],
    repoPath: "",
    license: "",
    enableGithubSync: false,
    enableConentSync: false,
    featuredImages: [],
    startedAt: "",
    category: null,
    tags: [],
  };
}

/**
 * 从 EditorInitialData 初始化表单数据
 */
function initializeFormData(initialData?: EditorInitialData): ProjectFormData {
  const defaultData = createDefaultProjectFormData();

  if (!initialData) {
    return defaultData;
  }

  return {
    ...defaultData,
    title: initialData.title || "",
    slug: initialData.slug || "",
    description: initialData.description || "",
    status: initialData.status || "DRAFT",
    demoUrl: initialData.demoUrl || "",
    repoUrl: initialData.repoUrl || "",
    techStack: initialData.techStack || [],
    repoPath: initialData.repoPath || "",
    license: initialData.license || "",
    enableGithubSync: initialData.enableGithubSync ?? false,
    enableConentSync: initialData.enableConentSync ?? false,
    featuredImages: initialData.featuredImages || [],
    startedAt: initialData.startedAt || "",
    category: initialData.categories?.[0] || null,
    tags: initialData.tags
      ? initialData.tags.map((name) => ({
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          isNew: false,
        }))
      : [],
  };
}

/**
 * ProjectEditorWrapper - Project 业务逻辑包装器
 *
 * 职责：
 * - 管理 Project 特定的字段状态
 * - 渲染对话框内容
 * - 处理保存/发布逻辑
 * - 处理 GitHub 同步功能
 */
export function ProjectEditorWrapper({
  content,
  storageKey,
  isEditMode = false,
  initialData,
  availableModes = ["visual", "markdown"],
  defaultMode = "visual",
  successRedirectPath = "/admin/projects",
  projectId,
  accessToken,
  enableGithubSyncAction = false,
}: ProjectEditorWrapperProps) {
  // ==================== 状态管理 ====================
  const [formData, setFormData] = useState<ProjectFormData>(() =>
    initializeFormData(initialData),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "draft" | "publish" | null
  >(null);

  const toast = useToast();
  const router = useRouter();

  // ==================== 初始化表单数据 ====================
  useEffect(() => {
    if (initialData) {
      setFormData(initializeFormData(initialData));
    }
  }, [initialData]);

  // ==================== 处理表单字段变化 ====================
  const handleFieldChange = useCallback(
    (
      field: keyof ProjectFormData,
      value: string | boolean | string[] | SelectedTag[] | null,
    ) => {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };

        // 如果禁用 GitHub 同步，同时禁用内容同步
        if (field === "enableGithubSync" && value === false) {
          newData.enableConentSync = false;
        }

        return newData;
      });
    },
    [],
  );

  // ==================== GitHub 同步处理 ====================
  const handleGithubSync = async () => {
    if (!projectId || !accessToken) {
      toast.error("缺少必要参数");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await syncProjectsGithub({
        access_token: accessToken,
        ids: [projectId],
      });

      if (result.success && result.data) {
        const projectResult = result.data.results[0];
        if (projectResult?.success) {
          toast.success(
            `同步成功 (Stars: ${projectResult.stars}, Forks: ${projectResult.forks})`,
          );
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(projectResult?.error || "同步失败");
        }
      } else {
        toast.error(result.message || "同步失败");
      }
    } catch (error) {
      console.error("GitHub 同步失败:", error);
      toast.error("同步失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== 保存详细信息 ====================
  const handleSaveDetails = async () => {
    if (!formData.title.trim()) {
      toast.error("请填写项目标题");
      return;
    }

    setIsSubmitting(true);
    try {
      // 保存配置到 localStorage
      const editorData = loadEditorContent(storageKey);
      if (editorData) {
        saveEditorContent(
          editorData.content,
          { ...formData, editorType: editorData.config?.editorType },
          true,
          storageKey,
        );
      }

      toast.success("详细信息已保存");
      setDetailsDialogOpen(false);
    } catch (error) {
      console.error("保存详细信息失败:", error);
      toast.error("保存失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== 最终保存/发布操作 ====================
  const handleFinalSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("请填写项目标题");
      return;
    }

    setIsSubmitting(true);
    try {
      // 创建新标签
      const newTags = formData.tags.filter((tag) => tag.isNew);
      if (newTags.length > 0) {
        const token = accessToken || localStorage.getItem("access_token");
        const { createTag } = await import("@/actions/tag");

        await Promise.all(
          newTags.map(async (tag) => {
            try {
              await createTag({
                access_token: token || undefined,
                name: tag.name,
              });
            } catch (error) {
              console.error(`创建标签 "${tag.name}" 失败:`, error);
            }
          }),
        );
      }

      // 获取当前编辑器内容
      let currentContent = "";
      if (typeof window !== "undefined") {
        try {
          const savedData = loadEditorContent(storageKey);
          currentContent = savedData?.content || "";
        } catch (error) {
          console.error("Failed to get editor content:", error);
        }
      }

      // 构建保存数据
      const tagNames = formData.tags.map((tag) => tag.name);

      let result;
      if (isEditMode) {
        const updateData = {
          slug: storageKey,
          title: formData.title,
          newSlug: formData.slug !== storageKey ? formData.slug : undefined,
          content: currentContent,
          status: formData.status,
          categories: formData.category ? [formData.category] : undefined,
          tags: tagNames.length > 0 ? tagNames : undefined,
          description: formData.description,
          demoUrl: formData.demoUrl || undefined,
          repoUrl: formData.repoUrl || undefined,
          repoPath: formData.repoPath || undefined,
          license: formData.license || undefined,
          enableGithubSync: formData.enableGithubSync,
          enableConentSync: formData.enableConentSync,
          featuredImages:
            formData.featuredImages.length > 0
              ? formData.featuredImages
              : undefined,
          startedAt: formData.startedAt || undefined,
          techStack: formData.techStack,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = await updateProject(updateData as any, {});
      } else {
        const createData = {
          title: formData.title,
          slug: formData.slug,
          content: currentContent,
          status: confirmAction === "publish" ? "PUBLISHED" : "DRAFT",
          categories: formData.category ? [formData.category] : undefined,
          tags: tagNames.length > 0 ? tagNames : undefined,
          description: formData.description,
          demoUrl: formData.demoUrl || undefined,
          repoUrl: formData.repoUrl || undefined,
          repoPath: formData.repoPath || undefined,
          license: formData.license || undefined,
          enableGithubSync: formData.enableGithubSync,
          enableConentSync: formData.enableConentSync,
          featuredImages:
            formData.featuredImages.length > 0
              ? formData.featuredImages
              : undefined,
          startedAt: formData.startedAt || undefined,
          techStack: formData.techStack,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = await createProject(createData as any, {});
      }

      // 处理结果
      let response;
      if (result instanceof Response) {
        response = await result.json();
      } else {
        response = result;
      }

      if (response.success) {
        if (isEditMode) {
          const statusText =
            formData.status === "PUBLISHED"
              ? "已发布"
              : formData.status === "ARCHIVED"
                ? "已归档"
                : formData.status === "Developing"
                  ? "开发中"
                  : "草稿";
          toast.success(`项目已保存为${statusText}`);
        } else {
          toast.success(
            confirmAction === "publish" ? "项目已发布" : "草稿已保存",
          );
        }

        // 清除草稿
        clearEditorContent(storageKey);
        setConfirmDialogOpen(false);

        // 延迟导航
        setTimeout(() => {
          router.push(successRedirectPath);
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

  // ==================== 状态栏操作按钮配置 ====================
  const statusBarActions: StatusBarActionConfig[] = [
    // GitHub 同步按钮（仅在编辑模式且启用时显示）
    ...(enableGithubSyncAction &&
    isEditMode &&
    formData.enableGithubSync &&
    formData.repoPath
      ? [
          {
            id: "github-sync",
            label: "GitHub 同步",
            icon: <RiGithubFill size="1em" />,
            variant: "ghost" as const,
            onClick: handleGithubSync,
            loading: isSubmitting,
            loadingText: "同步中...",
          },
        ]
      : []),
    {
      id: "details",
      label: isEditMode ? "更改详细信息" : "设置详细信息",
      variant: "ghost",
      onClick: () => {
        setDetailsDialogOpen(true);
      },
    },
    ...(isEditMode
      ? [
          {
            id: "save",
            label: "保存",
            variant: "primary" as const,
            onClick: () => {
              setConfirmAction("draft");
              setConfirmDialogOpen(true);
            },
          },
        ]
      : [
          {
            id: "save-draft",
            label: "保存为草稿",
            variant: "ghost" as const,
            onClick: () => {
              setConfirmAction("draft");
              setConfirmDialogOpen(true);
            },
          },
          {
            id: "publish",
            label: "发布",
            variant: "primary" as const,
            onClick: () => {
              setConfirmAction("publish");
              setConfirmDialogOpen(true);
            },
          },
        ]),
  ];

  // ==================== 渲染详细信息对话框内容 ====================
  const renderDetailsDialogContent = () => (
    <div className="px-6 py-6 space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
          基本信息
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="标题"
            value={formData.title}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            required
            size="sm"
          />
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => handleFieldChange("slug", e.target.value)}
            size="sm"
            helperText="URL 路径，例如：my-awesome-project。留空将从标题自动生成"
          />
          <Input
            label="描述"
            value={formData.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            rows={3}
            size="sm"
            className="col-span-2"
            required
          />
          <Input
            label="技术栈"
            value={(formData.techStack || []).join(", ")}
            onChange={(e) =>
              handleFieldChange(
                "techStack",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            helperText="多个技术栈用逗号分隔"
            className="col-span-2"
            size="sm"
          />
        </div>
      </div>

      {/* 分类与标签 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
          分类与标签
        </h3>
        <div className="grid grid-cols-1 gap-6">
          <CategoryInput
            label="分类"
            value={formData.category}
            onChange={(category) => handleFieldChange("category", category)}
            size="sm"
          />
          <TagInput
            label="标签"
            value={formData.tags}
            onChange={(tags) => handleFieldChange("tags", tags)}
            helperText="输入关键词搜索现有标签，或直接创建新标签"
            size="sm"
          />
        </div>
      </div>

      {/* 链接信息 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
          链接信息
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Demo URL"
            value={formData.demoUrl}
            onChange={(e) => handleFieldChange("demoUrl", e.target.value)}
            size="sm"
            helperText="https://example.com"
          />
          <Input
            label="仓库 URL"
            value={formData.repoUrl}
            onChange={(e) => handleFieldChange("repoUrl", e.target.value)}
            size="sm"
            helperText="https://github.com/user/repo"
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
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                项目状态
              </label>
              <Select
                value={formData.status}
                onChange={(value) => handleFieldChange("status", String(value))}
                options={[
                  { value: "DRAFT", label: "草稿" },
                  { value: "PUBLISHED", label: "已发布" },
                  { value: "ARCHIVED", label: "已归档" },
                  { value: "Developing", label: "开发中" },
                ]}
                size="sm"
              />
            </div>
          )}
          <Input
            label="开始时间"
            type="date"
            value={formData.startedAt}
            onChange={(e) => handleFieldChange("startedAt", e.target.value)}
            size="sm"
          />
        </div>
      </div>

      {/* GitHub 设置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2 flex items-center gap-2">
          <RiGithubFill size="1.2em" /> GitHub 同步
        </h3>
        <p className="text-sm text-muted-foreground">
          启用内容同步后，手动编辑的内容将被 GitHub README 覆盖
        </p>
        <div className="grid grid-cols-1 gap-6">
          <Input
            label="仓库路径"
            value={formData.repoPath}
            onChange={(e) => handleFieldChange("repoPath", e.target.value)}
            size="sm"
            helperText="用于 GitHub API 同步，例如：RavelloH/NeutralPress"
          />
          <Input
            label="开源许可证"
            value={formData.license}
            onChange={(e) => handleFieldChange("license", e.target.value)}
            size="sm"
            helperText="项目的开源许可证类型，例如：MIT"
          />
          <div className="flex flex-col gap-4">
            <Checkbox
              label="启用 GitHub 同步"
              checked={formData.enableGithubSync}
              onChange={(e) => {
                handleFieldChange("enableGithubSync", e.target.checked);
                if (!e.target.checked) {
                  handleFieldChange("enableConentSync", false);
                }
              }}
            />
            {formData.enableGithubSync && (
              <Checkbox
                label="同步 README 到内容"
                checked={formData.enableConentSync}
                onChange={(e) =>
                  handleFieldChange("enableConentSync", e.target.checked)
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* 特色图片 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
          特色图片
        </h3>
        <MediaSelector
          label="特色图片"
          value={formData.featuredImages}
          onChange={(urls) =>
            handleFieldChange(
              "featuredImages",
              Array.isArray(urls) ? urls : urls ? [urls] : [],
            )
          }
          multiple
          helperText="选择或上传项目的特色图片"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
        <Button
          label="取消"
          variant="ghost"
          onClick={() => setDetailsDialogOpen(false)}
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
          disabled={!formData.title.trim()}
        />
      </div>
    </div>
  );

  // ==================== 渲染确认对话框内容 ====================
  const renderConfirmDialogContent = () => (
    <div className="px-6 py-6 space-y-6">
      <p className="text-sm text-muted-foreground mb-4">
        请确认以下信息无误后继续。<span className="text-error">标题</span>
        为必填项。
      </p>

      {/* 基本信息 */}
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
              className={`text-sm ${formData.title ? "text-foreground" : "text-muted-foreground"}`}
            >
              {formData.title ||
                `（未设置，请点击"${isEditMode ? "更改" : "设置"}详细信息"填写）`}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Slug
            </label>
            <p className="text-sm font-mono text-foreground/80">
              {formData.slug || "（未设置，将从标题自动生成）"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              描述
            </label>
            <p className="text-sm text-foreground/80">
              {formData.description || "（未设置）"}
            </p>
          </div>
        </div>
      </div>

      {/* 发布设置 */}
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
                : formData.status === "PUBLISHED"
                  ? "已发布"
                  : formData.status === "DRAFT"
                    ? "草稿"
                    : formData.status === "Developing"
                      ? "开发中"
                      : "已归档"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              开始时间
            </label>
            <p className="text-sm text-foreground/80">
              {formData.startedAt || "（未设置）"}
            </p>
          </div>
        </div>
      </div>

      {/* 特色图片 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
          特色图片
        </h3>
        <div className="bg-muted/20 p-4 rounded-lg">
          {formData.featuredImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {formData.featuredImages.map((url, index) => (
                <div key={index} className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`特色图片预览 ${index + 1}`}
                    className="w-full max-h-[20em] rounded-md object-cover"
                  />
                  <p className="text-xs text-foreground/60 break-all">{url}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">（未设置）</p>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between gap-4 pt-4 border-t border-foreground/10">
        <Button
          label="取消"
          variant="ghost"
          onClick={() => setConfirmDialogOpen(false)}
          size="sm"
          disabled={isSubmitting}
        />
        <div className="flex gap-2">
          <Button
            label={isEditMode ? "更改详细信息" : "设置详细信息"}
            variant="ghost"
            onClick={() => {
              setConfirmDialogOpen(false);
              setDetailsDialogOpen(true);
            }}
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
            disabled={!formData.title.trim()}
          />
        </div>
      </div>
    </div>
  );

  // ==================== 渲染 ====================
  return (
    <>
      <EditorCore
        content={content}
        storageKey={storageKey}
        availableModes={availableModes}
        defaultMode={defaultMode}
        dialogs={[]}
        statusBarActions={statusBarActions}
        onSave={() => {
          setConfirmAction("draft");
          setConfirmDialogOpen(true);
        }}
        onPublish={() => {
          setConfirmAction("publish");
          setConfirmDialogOpen(true);
        }}
      />

      {/* 详细信息对话框 */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        title="项目详细信息"
        size="lg"
      >
        {renderDetailsDialogContent()}
      </Dialog>

      {/* 确认对话框 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        title={
          isEditMode
            ? "确认保存"
            : confirmAction === "publish"
              ? "确认发布"
              : "确认保存为草稿"
        }
        size="lg"
      >
        {renderConfirmDialogContent()}
      </Dialog>
    </>
  );
}
