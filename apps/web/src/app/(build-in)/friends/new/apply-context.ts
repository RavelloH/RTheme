import "server-only";

import { cookies } from "next/headers";

import { authVerify } from "@/lib/server/auth-verify";
import { getConfigs } from "@/lib/server/config-cache";

export type FriendLinkApplyUser = {
  uid: number;
  username: string;
  nickname: string;
};

export type FriendLinkApplySiteProfile = {
  showProfile: boolean;
  avatar: string;
  name: string;
  website: string;
  description: string;
};

export type FriendLinkApplyContext = {
  user: FriendLinkApplyUser | null;
  applyEnabled: boolean;
  checkBackLinkEnabled: boolean;
  siteProfile: FriendLinkApplySiteProfile;
};

export async function getFriendLinkApplyContext(): Promise<FriendLinkApplyContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value;
  const user = token
    ? await authVerify({
        allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
        accessToken: token,
      })
    : null;

  const [
    applyEnabled,
    checkBackLinkEnabled,
    showProfile,
    profileAvatar,
    profileName,
    profileWebsite,
    profileDescription,
    siteTitle,
    siteUrl,
    siteSlogan,
  ] = await getConfigs([
    "friendlink.apply.enable",
    "friendlink.apply.checkBackLink.enable",
    "friendship.showProfile.enable",
    "friendship.profile.avatar",
    "friendship.profile.name",
    "friendship.profile.website",
    "friendship.profile.description",
    "site.title",
    "site.url",
    "site.slogan.primary",
  ]);

  return {
    user: user
      ? {
          uid: user.uid,
          username: user.username,
          nickname: user.nickname,
        }
      : null,
    applyEnabled,
    checkBackLinkEnabled,
    siteProfile: {
      showProfile,
      avatar: profileAvatar || "/icon/512x",
      name: profileName || siteTitle,
      website: profileWebsite || siteUrl,
      description: profileDescription || siteSlogan,
    },
  };
}
