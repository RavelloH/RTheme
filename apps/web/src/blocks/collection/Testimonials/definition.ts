import { createBlockDefinition } from "@/blocks/core/definition";

export const testimonialBlockDefinition = createBlockDefinition({
  type: "testimonial",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.TESTIMONIAL_BLOCK_FORM_CONFIG,
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
      { path: "avatar", kind: "image", output: "avatarData" },
      { path: "avatar2", kind: "image", output: "avatar2Data" },
    ],
  },
});
