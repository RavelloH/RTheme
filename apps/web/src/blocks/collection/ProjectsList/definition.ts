import { createBlockDefinition } from "@/blocks/core/definition";

export const projectsListBlockDefinition = createBlockDefinition({
  type: "projects-list",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PROJECTS_LIST_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ["projects", "categories", "tags", "photos"],
  },
  capabilities: {
    context: "inherit",
    media: [],
  },
});
