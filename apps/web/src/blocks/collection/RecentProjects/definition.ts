import { createBlockDefinition } from "@/blocks/core/definition";

export const projectsBlockDefinition = createBlockDefinition({
  type: "projects",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PROJECTS_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ["projects", "photos"],
  },
  capabilities: {
    context: "inherit",
    placeholders: {
      enabled: true,
      source: "content",
      withContext: true,
    },
    media: [],
  },
});
