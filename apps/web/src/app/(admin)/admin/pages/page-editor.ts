import type { PageItem } from "@/lib/server/page-cache";
import { getRawPageById } from "@/lib/server/page-cache";
import { getPageEditorPathByContentType } from "@/lib/shared/page-editor-route";

export async function getPageByIdParam(
  rawId: string,
): Promise<PageItem | null> {
  return getRawPageById(rawId);
}

export function resolveContentTypeEditorPath(page: PageItem): string {
  return getPageEditorPathByContentType(page.contentType, page.id);
}
