"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AutoTransition } from "@/ui/AutoTransition";

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  editor: Editor | null;
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const newHeadings: Heading[] = [];

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const id = `heading-${pos}`;
          newHeadings.push({
            level: node.attrs.level,
            text: node.textContent,
            id,
          });
        }
      });

      setHeadings(newHeadings);
    };

    // 初始化
    updateHeadings();

    // 监听内容变化
    editor.on("update", updateHeadings);

    return () => {
      editor.off("update", updateHeadings);
    };
  }, [editor]);

  const scrollToHeading = (id: string) => {
    setActiveId(id);
    // TODO: 实现滚动到对应标题的功能
  };

  return (
    <AutoTransition>
      {headings.length === 0 ? (
        <></>
      ) : (
        <nav className="space-y-1 bg-background/50 backdrop-blur-sm p-4">
          <div className="text-xs font-semibold text-foreground/60 mb-3">
            目录
          </div>
          {headings.map((heading, index) => (
            <motion.button
              key={heading.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => scrollToHeading(heading.id)}
              className={`
            block w-full text-left py-1.5 text-xs rounded-md
            transition-colors duration-150
            ${activeId === heading.id ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"}
          `}
              style={{
                paddingLeft: `${(heading.level - 1) * 8 + 8}px`,
              }}
            >
              <span className="line-clamp-2">
                {heading.text || "（无标题）"}
              </span>
            </motion.button>
          ))}
        </nav>
      )}
    </AutoTransition>
  );
}
