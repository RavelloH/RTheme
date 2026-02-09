import "server-only";

import { randomUUID } from "crypto";

import { getFriendLinkApplyContext } from "@/app/(build-in)/friends/new/apply-context";
import FriendLinkApplyModal from "@/app/@modal/(.)friends/new/FriendLinkApplyModal";

export default async function FriendLinkApplyInterceptPage() {
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
