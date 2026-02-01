import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import * as TabsComponents from "fumadocs-ui/components/tabs";
import * as AccordionsComponents from "fumadocs-ui/components/accordion";
import * as FilesComponents from "fumadocs-ui/components/files";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    pre: (props) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    img: (props) => (
      <ImageZoom
        {...(props as React.ComponentProps<typeof ImageZoom>)}
        className="border-2 rounded"
      />
    ),
    ...TabsComponents,
    ...AccordionsComponents,
    ...FilesComponents,
    ...components,
  };
}
