export type PageEditorContentType =
  | "BLOCK"
  | "MARKDOWN"
  | "MDX"
  | "HTML"
  | "BUILDIN";

export function getPageEditorEntryPath(id: string): string {
  return `/admin/pages?id=${encodeURIComponent(id)}`;
}

export function getPageEditorPathByContentType(
  contentType: PageEditorContentType,
  id: string,
): string {
  if (contentType === "BUILDIN") {
    return getPageEditorEntryPath(id);
  }
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
