import { createBlockDefinition } from "@/blocks/core/definition";

export const featuredProjectsBlockDefinition = createBlockDefinition({
  type: "featured-projects",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.FEATURED_PROJECTS_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  capabilities: {
    context: "inherit",
    media: [],
  },
});
