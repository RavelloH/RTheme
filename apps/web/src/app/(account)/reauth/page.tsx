import ReauthClient from "./ReauthClient";
import { getConfig } from "@/lib/server/config-cache";
import { generateMetadata } from "@/lib/server/seo";
import { Suspense } from "react";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

export const metadata = await generateMetadata(
  {
    title: "重新验证身份",
    description: "为了您的账户安全,请重新验证您的身份。",
    robots: {
      index: false,
      follow: false,
    },
  },
  {
    pathname: "/reauth",
  },
);

export default async function ReauthPage() {
  const passkeyEnabled = await getConfig("user.passkey.enabled");

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <ReauthClient passkeyEnabled={passkeyEnabled} />
    </Suspense>
  );
}
