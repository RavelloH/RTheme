import { createBlockDefinition } from "@/blocks/core/definition";

export const multiRowLayoutBlockDefinition = createBlockDefinition({
  type: "multi-row-layout",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.MULTI_ROW_LAYOUT_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  capabilities: {
    context: "inherit",
    placeholders: {
      enabled: true,
      source: "content",
      withContext: true,
    },
    media: [
      { path: "row1.images", kind: "imageArray", output: "row1" },
      { path: "row2.images", kind: "imageArray", output: "row2" },
      { path: "row3.images", kind: "imageArray", output: "row3" },
      { path: "row4.images", kind: "imageArray", output: "row4" },
      { path: "row5.images", kind: "imageArray", output: "row5" },
      { path: "row6.images", kind: "imageArray", output: "row6" },
      { path: "row7.images", kind: "imageArray", output: "row7" },
      { path: "row8.images", kind: "imageArray", output: "row8" },
      { path: "row9.images", kind: "imageArray", output: "row9" },
      { path: "row10.images", kind: "imageArray", output: "row10" },
      { path: "row11.images", kind: "imageArray", output: "row11" },
      { path: "row12.images", kind: "imageArray", output: "row12" },
    ],
  },
});
