import "server-only";

import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import { getFriendLinkApplyContext } from "@/app/(build-in)/friends/new/apply-context";
import FriendLinkApplyModal from "@/app/@modal/(.)friends/new/FriendLinkApplyModal";

export default async function FriendLinkApplyInterceptPage() {
  await connection();

  const context = await getFriendLinkApplyContext();

  return (
    <FriendLinkApplyModal
      key={randomUUID()}
      currentUser={context.user}
      applyEnabled={context.applyEnabled}
      checkBackLinkEnabled={context.checkBackLinkEnabled}
      siteProfile={context.siteProfile}
    />
  );
}
