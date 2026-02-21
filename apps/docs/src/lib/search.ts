"use client";

import { create } from "@orama/orama";
import { createTokenizer } from "@orama/tokenizers/mandarin";
import type { OramaWithHighlight } from "fumadocs-core/search/server";

export function initOrama() {
  return create<OramaWithHighlight>({
    schema: { _: "string" },
    components: {
      tokenizer: createTokenizer(),
    },
  });
}
