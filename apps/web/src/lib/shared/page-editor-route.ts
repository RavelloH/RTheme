export type PageEditorContentType = "BLOCK" | "MARKDOWN" | "MDX" | "HTML";

export function getPageEditorEntryPath(id: string): string {
  return `/admin/pages/${id}`;
}

export function getPageEditorPathByContentType(
  contentType: PageEditorContentType,
  id: string,
): string {
  if (contentType === "BLOCK") {
    return `/admin/pages/block/${id}`;
  }
  if (contentType === "MARKDOWN") {
    return `/admin/pages/markdown/${id}`;
  }
  if (contentType === "MDX") {
    return `/admin/pages/mdx/${id}`;
  }
  return `/admin/pages/html/${id}`;
}
