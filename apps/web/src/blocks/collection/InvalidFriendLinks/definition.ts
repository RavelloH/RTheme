import { createBlockDefinition } from "@/blocks/core/definition";

export const invalidFriendLinksBlockDefinition = createBlockDefinition({
  type: "invalid-friend-links",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.INVALID_FRIEND_LINKS_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  capabilities: {
    context: "none",
    placeholders: {
      enabled: false,
      source: "content",
      withContext: false,
    },
    media: [],
  },
});
