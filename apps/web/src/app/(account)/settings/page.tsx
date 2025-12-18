import { getConfig } from "@/lib/server/configCache";
import type { OAuthProvider } from "@/lib/server/oauth";
import SettingsClient from "./SettingsClient";
import { ToastProvider } from "@/ui/Toast";

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

export default async function SettingsPage() {
  const enabledSSOProviders = await getEnabledSSOProviders();

  return (
    <ToastProvider>
      <SettingsClient enabledSSOProviders={enabledSSOProviders} />
    </ToastProvider>
  );
}
