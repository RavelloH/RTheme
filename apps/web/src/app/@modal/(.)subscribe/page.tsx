import "server-only";

import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import { getSubscribeContext } from "@/app/(build-in)/subscribe/subscribe-context";
import SubscribeModal from "@/app/@modal/(.)subscribe/SubscribeModal";

export default async function SubscribeInterceptPage() {
  await connection();
  const context = await getSubscribeContext();

  return <SubscribeModal key={randomUUID()} {...context} />;
}
