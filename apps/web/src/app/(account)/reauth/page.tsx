import { ToastProvider } from "@/ui/Toast";
import ReauthClient from "./ReauthClient";
import { getConfig } from "@/lib/server/configCache";

export const metadata = {
  title: "重新验证身份",
  description: "为了您的账户安全,请重新验证您的身份。",
  robot: {
    index: false,
    follow: false,
  },
};

export default async function ReauthPage() {
  const passkeyEnabled = await getConfig<boolean>("user.passkey.enabled");

  return (
    <ToastProvider>
      <ReauthClient passkeyEnabled={passkeyEnabled} />
    </ToastProvider>
  );
}
