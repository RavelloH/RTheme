import Link from "next/link";

import { unsubscribeMailSubscription } from "@/actions/mail-subscription";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "取消订阅",
    description: "取消邮件订阅",
    robots: {
      index: false,
      follow: false,
    },
  },
  { pathname: "/subscribe/unsubscribe" },
);

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function getFirstParam(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0] || "";
  }
  return "";
}

interface SubscribeUnsubscribePageProps {
  searchParams?: Promise<SearchParamsRecord>;
}

export default async function SubscribeUnsubscribePage({
  searchParams,
}: SubscribeUnsubscribePageProps) {
  const resolvedSearchParams = await searchParams;
  const token = getFirstParam(resolvedSearchParams?.token);

  const result = token
    ? await unsubscribeMailSubscription({ token })
    : {
        success: false,
        message: "缺少退订令牌",
      };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-sm border border-foreground/10 bg-background px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-wide">
          {result.success ? "已取消订阅" : "退订失败"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/subscribe"
            className="inline-flex items-center rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-85"
          >
            返回订阅中心
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-sm border border-foreground/20 px-4 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5"
          >
            回到首页
          </Link>
        </div>
      </div>
    </div>
  );
}
