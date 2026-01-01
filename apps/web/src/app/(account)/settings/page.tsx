import { getConfig } from "@/lib/server/config-cache";
import type { OAuthProvider } from "@/lib/server/oauth";
import SettingsClient from "./SettingsClient";
import { generateMetadata } from "@/lib/server/seo";
import { Suspense } from "react";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

async function getEnabledSSOProviders(): Promise<OAuthProvider[]> {
  const providers: OAuthProvider[] = ["google", "github", "microsoft"];
  const enabled: OAuthProvider[] = [];

  for (const provider of providers) {
    const isEnabled = await getConfig<boolean>(`user.sso.${provider}.enabled`);
    if (isEnabled) {
      enabled.push(provider);
    }
  }

  return enabled;
}

export const metadata = await generateMetadata(
  {
    title: "设置 / Settings",
    description: "管理您的账户设置，包括个人信息、安全选项等。",
  },
  {
    pathname: "/settings",
  },
);

export default async function SettingsPage() {
  const enabledSSOProviders = await getEnabledSSOProviders();
  const passkeyEnabled = await getConfig<boolean>("user.passkey.enabled");

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <SettingsClient
        enabledSSOProviders={enabledSSOProviders}
        passkeyEnabled={passkeyEnabled}
      />
    </Suspense>
  );
}
