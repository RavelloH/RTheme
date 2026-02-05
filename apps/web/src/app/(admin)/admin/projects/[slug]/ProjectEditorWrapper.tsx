"use client";

import type { ProjectDetail } from "@repo/shared-types/api/project";

import { syncProjectsGithub } from "@/actions/project";
import Editor from "@/components/client/features/editor/Editor";
import { PROJECT_EDITOR_CONFIG } from "@/config/editor-presets";
import type { EditorInitialData } from "@/types/editor-config";
import { useToast } from "@/ui/Toast";

type ProjectEditorWrapperProps = {
  project: ProjectDetail;
  access_token: string;
};

export default function ProjectEditorWrapper({
  project,
  access_token,
}: ProjectEditorWrapperProps) {
  const toast = useToast();

  const initialData: EditorInitialData = {
    title: project.title,
    slug: project.slug,
    description: project.description,
    status: project.status,
    demoUrl: project.demoUrl || "",
    repoUrl: project.repoUrl || "",
    techStack: project.techStack || [],
    repoPath: project.repoPath || "",
    license: project.license || "",
    enableGithubSync: project.enableGithubSync,
    enableConentSync: project.enableConentSync,
    featuredImages: project.featuredImages || [],
    startedAt: project.startedAt
      ? new Date(project.startedAt).toISOString().split("T")[0]
      : "",
    categories: project.categories,
    tags: project.tags,
  };

  return (
    <Editor
      content={project.content || ""}
      storageKey={project.slug}
      isEditMode={true}
      config={PROJECT_EDITOR_CONFIG}
      initialData={initialData}
      onExtraAction={async (actionId, _formData) => {
        if (actionId === "github-sync") {
          const result = await syncProjectsGithub({
            access_token,
            ids: [project.id],
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
        }
      }}
    />
  );
}
