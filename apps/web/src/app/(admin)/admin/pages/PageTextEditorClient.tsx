"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updatePage } from "@/actions/page";
import { EditorCore } from "@/components/client/features/editor/EditorCore";
import { useNavigateWithTransition } from "@/components/ui/Link";
import {
  clearEditorContent,
  loadEditorContent,
} from "@/lib/client/editor-persistence";
import runWithAuth from "@/lib/client/run-with-auth";
import type { EditorMode, StatusBarActionConfig } from "@/types/editor-config";
import { useToast } from "@/ui/Toast";

type TextContentType = "MARKDOWN" | "MDX" | "HTML";

interface PageTextEditorClientProps {
  page: {
    id: string;
    title: string;
    slug: string;
    content: string;
    contentType: TextContentType;
  };
}

const editorModeConfig: Record<
  TextContentType,
  {
    availableModes: EditorMode[];
    defaultMode: EditorMode;
    modeLabel: string;
  }
> = {
  MARKDOWN: {
    availableModes: ["visual", "markdown"],
    defaultMode: "visual",
    modeLabel: "Markdown",
  },
  MDX: {
    availableModes: ["mdx"],
    defaultMode: "mdx",
    modeLabel: "MDX",
  },
  HTML: {
    availableModes: ["html"],
    defaultMode: "html",
    modeLabel: "HTML",
  },
};

export default function PageTextEditorClient({
  page,
}: PageTextEditorClientProps) {
  const router = useRouter();
  const navigate = useNavigateWithTransition();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [currentContent, setCurrentContent] = useState(page.content);
  const storageKey = `page-editor:${page.id}`;
  const modeConfig = editorModeConfig[page.contentType];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const draft = loadEditorContent(storageKey);
      const contentToSave = draft?.content ?? currentContent;

      const result = await runWithAuth(updatePage, {
        slug: page.slug,
        content: contentToSave,
      });

      if (result && "data" in result && result.data) {
        clearEditorContent(storageKey);
        setCurrentContent(contentToSave);
        toast.success(`页面「${page.title}」已保存`);
        router.refresh();
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      console.error("保存页面内容失败:", error);
      toast.error("保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  const statusBarActions: StatusBarActionConfig[] = [
    {
      id: "back",
      label: "返回页面列表",
      variant: "ghost",
      onClick: () => navigate("/admin/pages"),
    },
    {
      id: "save",
      label: "保存页面",
      variant: "primary",
      onClick: handleSave,
      loading: isSaving,
    },
  ];

  return (
    <div className="h-full">
      <EditorCore
        content={currentContent}
        storageKey={storageKey}
        availableModes={modeConfig.availableModes}
        defaultMode={modeConfig.defaultMode}
        statusBarActions={statusBarActions}
        onChange={setCurrentContent}
      />
    </div>
  );
}
