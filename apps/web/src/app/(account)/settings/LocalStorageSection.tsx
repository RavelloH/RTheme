"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RiDeleteBinLine } from "@remixicon/react";

import { AlertDialog } from "@/ui/AlertDialog";
import { Button } from "@/ui/Button";
import Clickable from "@/ui/Clickable";
import { useToast } from "@/ui/Toast";

type ManagedStorageKey =
  | "editor"
  | "page_editor"
  | "unread_notice_count"
  | "viewcount_cache";

type DeleteAction =
  | { type: "all" }
  | { type: "key"; key: ManagedStorageKey }
  | { type: "editorDraft"; draftKey: string }
  | { type: "pageDraft"; pageId: string };

interface EditorDraftItem {
  draftKey: string;
  title: string;
  typeLabel: string;
  lastUpdatedAt: string | null;
  contentLength: number;
}

interface PageDraftItem {
  pageId: string;
  updatedAt: string | null;
  blockCount: number;
}

interface StorageSnapshot {
  keyExists: Record<ManagedStorageKey, boolean>;
  summaries: Record<ManagedStorageKey, string>;
  editorDrafts: EditorDraftItem[];
  pageDrafts: PageDraftItem[];
  totalSize: number;
}

const MANAGED_STORAGE_KEYS: ManagedStorageKey[] = [
  "editor",
  "page_editor",
  "unread_notice_count",
  "viewcount_cache",
];

const STORAGE_META: Record<
  ManagedStorageKey,
  {
    label: string;
    description: string;
  }
> = {
  editor: {
    label: "编辑器草稿",
    description: "文章/项目编辑器自动保存的草稿",
  },
  page_editor: {
    label: "页面布局草稿",
    description: "可视化页面编辑器自动保存的草稿",
  },
  unread_notice_count: {
    label: "未读通知缓存",
    description: "通知未读数量缓存",
  },
  viewcount_cache: {
    label: "访问量缓存",
    description: "文章访问量本地缓存",
  },
};

function createEmptySnapshot(): StorageSnapshot {
  return {
    keyExists: {
      editor: false,
      page_editor: false,
      unread_notice_count: false,
      viewcount_cache: false,
    },
    summaries: {
      editor: "未发现缓存",
      page_editor: "未发现缓存",
      unread_notice_count: "未发现缓存",
      viewcount_cache: "未发现缓存",
    },
    editorDrafts: [],
    pageDrafts: [],
    totalSize: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getTimeValue(value: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "未知";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知";

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inferDraftType(config: Record<string, unknown>): string {
  const hasProjectField =
    typeof config.demoUrl === "string" ||
    typeof config.repoUrl === "string" ||
    Array.isArray(config.techStack);
  if (hasProjectField) return "项目草稿";

  const hasPostField =
    typeof config.excerpt === "string" ||
    typeof config.allowComments === "boolean" ||
    typeof config.isPinned === "boolean";
  if (hasPostField) return "文章草稿";

  return "草稿";
}

function resolveDraftTitle(
  draftKey: string,
  config: Record<string, unknown>,
): string {
  const title = typeof config.title === "string" ? config.title.trim() : "";
  if (title) return title;

  if (draftKey === "new") {
    return "未命名新建内容";
  }
  return draftKey;
}

function buildSnapshot(): StorageSnapshot {
  const snapshot = createEmptySnapshot();

  MANAGED_STORAGE_KEYS.forEach((key) => {
    snapshot.keyExists[key] = localStorage.getItem(key) !== null;
  });

  const editorRaw = localStorage.getItem("editor");
  const editorObject = parseObject(editorRaw);
  if (editorRaw !== null && !editorObject) {
    snapshot.summaries.editor = "数据格式异常，可直接清空整项";
  } else if (editorObject) {
    snapshot.editorDrafts = Object.entries(editorObject)
      .map(([draftKey, value]) => {
        const item = isRecord(value) ? value : {};
        const config = isRecord(item.config) ? item.config : {};
        const content = typeof item.content === "string" ? item.content : "";
        const lastUpdatedAt =
          typeof item.lastUpdatedAt === "string" ? item.lastUpdatedAt : null;

        return {
          draftKey,
          title: resolveDraftTitle(draftKey, config),
          typeLabel: inferDraftType(config),
          lastUpdatedAt,
          contentLength: content.length,
        };
      })
      .sort(
        (a, b) => getTimeValue(b.lastUpdatedAt) - getTimeValue(a.lastUpdatedAt),
      );

    snapshot.summaries.editor = `${snapshot.editorDrafts.length} 份草稿`;
  }

  const pageEditorRaw = localStorage.getItem("page_editor");
  const pageEditorObject = parseObject(pageEditorRaw);
  if (pageEditorRaw !== null && !pageEditorObject) {
    snapshot.summaries.page_editor = "数据格式异常，可直接清空整项";
  } else if (pageEditorObject) {
    snapshot.pageDrafts = Object.entries(pageEditorObject)
      .map(([pageId, value]) => {
        const item = isRecord(value) ? value : {};
        const blocks = Array.isArray(item.blocks) ? item.blocks : [];
        const updatedAt =
          typeof item.updatedAt === "string" ? item.updatedAt : null;
        return {
          pageId,
          updatedAt,
          blockCount: blocks.length,
        };
      })
      .sort((a, b) => getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt));

    snapshot.summaries.page_editor = `${snapshot.pageDrafts.length} 份页面草稿`;
  }

  const unreadRaw = localStorage.getItem("unread_notice_count");
  const unreadObject = parseObject(unreadRaw);
  if (unreadRaw !== null && !unreadObject) {
    snapshot.summaries.unread_notice_count = "数据格式异常，可直接清空整项";
  } else if (unreadObject) {
    const count =
      typeof unreadObject.count === "number" ? unreadObject.count : null;
    const messageCount =
      typeof unreadObject.messageCount === "number"
        ? unreadObject.messageCount
        : null;
    const cachedAt =
      typeof unreadObject.cachedAt === "number" ? unreadObject.cachedAt : null;

    const parts: string[] = [];
    if (count !== null) parts.push(`通知 ${count}`);
    if (messageCount !== null) parts.push(`私信 ${messageCount}`);
    if (cachedAt !== null) parts.push(`缓存于 ${formatTime(cachedAt)}`);

    snapshot.summaries.unread_notice_count =
      parts.length > 0 ? parts.join("，") : "存在缓存数据";
  }

  const viewcountRaw = localStorage.getItem("viewcount_cache");
  const viewcountObject = parseObject(viewcountRaw);
  if (viewcountRaw !== null && !viewcountObject) {
    snapshot.summaries.viewcount_cache = "数据格式异常，可直接清空整项";
  } else if (viewcountObject) {
    snapshot.summaries.viewcount_cache = `缓存 ${Object.keys(viewcountObject).length} 篇文章`;
  }

  // 计算总大小（字节）
  snapshot.totalSize = MANAGED_STORAGE_KEYS.reduce((total, key) => {
    const item = localStorage.getItem(key);
    return total + (item ? new Blob([item]).size : 0);
  }, 0);

  return snapshot;
}

function removeEditorDraft(draftKey: string): boolean {
  const editorObject = parseObject(localStorage.getItem("editor"));
  if (!editorObject || !(draftKey in editorObject)) {
    return false;
  }

  delete editorObject[draftKey];

  if (Object.keys(editorObject).length === 0) {
    localStorage.removeItem("editor");
  } else {
    localStorage.setItem("editor", JSON.stringify(editorObject));
  }

  return true;
}

function removePageDraft(pageId: string): boolean {
  const pageEditorObject = parseObject(localStorage.getItem("page_editor"));
  if (!pageEditorObject || !(pageId in pageEditorObject)) {
    return false;
  }

  delete pageEditorObject[pageId];

  if (Object.keys(pageEditorObject).length === 0) {
    localStorage.removeItem("page_editor");
  } else {
    localStorage.setItem("page_editor", JSON.stringify(pageEditorObject));
  }

  return true;
}

/**
 * 本地存储管理板块组件
 */
export function LocalStorageSection() {
  const toast = useToast();
  const [snapshot, setSnapshot] =
    useState<StorageSnapshot>(createEmptySnapshot);
  const [pendingDeleteAction, setPendingDeleteAction] =
    useState<DeleteAction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshSnapshot = useCallback(() => {
    if (typeof window === "undefined") return;
    setSnapshot(buildSnapshot());
  }, []);

  useEffect(() => {
    refreshSnapshot();

    const handleStorage = () => {
      refreshSnapshot();
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshSnapshot]);

  const confirmConfig = useMemo(() => {
    if (!pendingDeleteAction) {
      return null;
    }

    switch (pendingDeleteAction.type) {
      case "all":
        return {
          title: "确认执行全部清理？",
          description: "你可能会丢失编辑器草稿等记录。",
          confirmText: "全部清理",
        };
      case "key":
        return {
          title: `确认清空 ${STORAGE_META[pendingDeleteAction.key].label}？`,
          description: `将删除 localStorage 中的 "${pendingDeleteAction.key}" 整项数据，此操作不可恢复。`,
          confirmText: "确认清空",
        };
      case "editorDraft":
        return {
          title: "确认删除这份草稿？",
          description: `将删除 editor 中 key 为 "${pendingDeleteAction.draftKey}" 的草稿。\n此操作不可恢复。`,
          confirmText: "删除草稿",
        };
      case "pageDraft":
        return {
          title: "确认删除这份页面草稿？",
          description: `将删除 page_editor 中 pageId 为 "${pendingDeleteAction.pageId}" 的草稿。\n此操作不可恢复。`,
          confirmText: "删除草稿",
        };
      default:
        return null;
    }
  }, [pendingDeleteAction]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteAction || typeof window === "undefined") return;

    setIsDeleting(true);
    try {
      switch (pendingDeleteAction.type) {
        case "all": {
          MANAGED_STORAGE_KEYS.forEach((key) => {
            localStorage.removeItem(key);
          });
          toast.success("已完成全部清理");
          break;
        }
        case "key": {
          localStorage.removeItem(pendingDeleteAction.key);
          toast.success(
            `已清空 ${STORAGE_META[pendingDeleteAction.key].label}`,
          );
          break;
        }
        case "editorDraft": {
          const removed = removeEditorDraft(pendingDeleteAction.draftKey);
          if (removed) {
            toast.success("草稿已删除");
          } else {
            toast.error("删除失败：草稿不存在或数据格式异常");
          }
          break;
        }
        case "pageDraft": {
          const removed = removePageDraft(pendingDeleteAction.pageId);
          if (removed) {
            toast.success("页面草稿已删除");
          } else {
            toast.error("删除失败：草稿不存在或数据格式异常");
          }
          break;
        }
      }
    } catch (error) {
      console.error("Failed to clear localStorage data:", error);
      toast.error("删除失败，请稍后重试");
    } finally {
      setPendingDeleteAction(null);
      setIsDeleting(false);
      refreshSnapshot();
    }
  }, [pendingDeleteAction, refreshSnapshot, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
          本地存储
        </h2>
        <p className="text-muted-foreground text-sm">
          管理当前 App 客户端的 localStorage 缓存数据
        </p>
      </div>

      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            全部清理
          </h3>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            这将清除本地存储中的草稿缓存及部分缓存数据。目前可清理大小：
            {(snapshot.totalSize / 1024 / 1024).toFixed(2)} MB
          </p>
          <Button
            label="全部清理"
            variant="danger"
            size="sm"
            onClick={() => setPendingDeleteAction({ type: "all" })}
          />
        </div>
      </div>

      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            可删除项目
          </h3>
          <p className="text-sm text-muted-foreground mt-1">按项清理本地缓存</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {MANAGED_STORAGE_KEYS.map((key, index) => {
              const hasData = snapshot.keyExists[key];
              const meta = STORAGE_META[key];

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-4 pb-4 pr-5 ${
                    index !== MANAGED_STORAGE_KEYS.length - 1
                      ? "border-b border-foreground/10"
                      : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground font-medium">
                        {meta.label}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {meta.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {snapshot.summaries[key]}
                    </p>
                  </div>

                  <Clickable
                    onClick={() => setPendingDeleteAction({ type: "key", key })}
                    className="text-error transition-colors"
                    disabled={!hasData}
                  >
                    <RiDeleteBinLine size="1.25em" />
                  </Clickable>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            文章/项目草稿明细
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            来自 <code>editor</code>
          </p>
        </div>

        <div className="p-6">
          {snapshot.editorDrafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {snapshot.keyExists.editor
                ? snapshot.summaries.editor
                : "暂无可删除的文章/项目草稿"}
            </p>
          ) : (
            <div className="space-y-0">
              {snapshot.editorDrafts.map((draft, index) => (
                <div
                  key={draft.draftKey}
                  className={`py-4 flex items-center justify-between gap-4 pr-5 ${
                    index !== snapshot.editorDrafts.length - 1
                      ? "border-b border-foreground/10"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">
                      {draft.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {draft.typeLabel} · key: <code>{draft.draftKey}</code>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      最后更新：{formatTime(draft.lastUpdatedAt)} · 内容长度：
                      {draft.contentLength} 字符
                    </p>
                  </div>

                  <Clickable
                    onClick={() =>
                      setPendingDeleteAction({
                        type: "editorDraft",
                        draftKey: draft.draftKey,
                      })
                    }
                    className="text-error transition-colors flex-shrink-0"
                  >
                    <RiDeleteBinLine size="1.25em" />
                  </Clickable>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            页面布局草稿明细
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            来自 <code>page_editor</code>
          </p>
        </div>

        <div className="p-6">
          {snapshot.pageDrafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {snapshot.keyExists.page_editor
                ? snapshot.summaries.page_editor
                : "暂无可删除的页面草稿"}
            </p>
          ) : (
            <div className="space-y-0">
              {snapshot.pageDrafts.map((draft, index) => (
                <div
                  key={draft.pageId}
                  className={`py-4 flex items-center justify-between gap-4 pr-5 ${
                    index !== snapshot.pageDrafts.length - 1
                      ? "border-b border-foreground/10"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">
                      页面 ID: <code>{draft.pageId}</code>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      区块数量：{draft.blockCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      最后更新：{formatTime(draft.updatedAt)}
                    </p>
                  </div>

                  <Clickable
                    onClick={() =>
                      setPendingDeleteAction({
                        type: "pageDraft",
                        pageId: draft.pageId,
                      })
                    }
                    className="text-error transition-colors flex-shrink-0"
                  >
                    <RiDeleteBinLine size="1.25em" />
                  </Clickable>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={Boolean(confirmConfig)}
        onClose={() => {
          if (!isDeleting) {
            setPendingDeleteAction(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title={confirmConfig?.title || "确认操作"}
        description={confirmConfig?.description}
        confirmText={confirmConfig?.confirmText || "确认"}
        cancelText="取消"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
