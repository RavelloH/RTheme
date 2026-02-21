export const MAIL_SUBSCRIPTIONS_REFRESH_EVENT =
  "mail-subscriptions-refresh" as const;

export type MailSubscriptionsRefreshMessage = {
  type: typeof MAIL_SUBSCRIPTIONS_REFRESH_EVENT;
  source: "dispatch-panel" | "table";
};
