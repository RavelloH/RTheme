import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const projectsBlockDefinition = createBlockDefinition({
  type: "projects",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PROJECTS_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
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
