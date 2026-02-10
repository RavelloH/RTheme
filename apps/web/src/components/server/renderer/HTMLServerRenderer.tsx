import "server-only";

interface HTMLServerRendererProps {
  source: string;
  className?: string;
}

/**
 * 服务端 HTML 渲染器
 * - 与 Markdown/MDX 保持一致的内容容器样式
 */
export default function HTMLServerRenderer({
  source,
  className = "max-w-4xl mx-auto md-content",
}: HTMLServerRendererProps) {
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: source }} />
  );
}
