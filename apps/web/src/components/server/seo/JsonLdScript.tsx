import { type JsonLdGraph, serializeJsonLdGraph } from "@/lib/server/seo";

interface JsonLdScriptProps {
  graph: JsonLdGraph;
  id?: string;
}

export default function JsonLdScript({ graph, id }: JsonLdScriptProps) {
  if (graph.length === 0) return null;

  const json = serializeJsonLdGraph(graph);
  if (!json) return null;

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
