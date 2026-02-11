import "server-only";

import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import SubscribeModal from "@/app/@modal/(.)subscribe/SubscribeModal";

export default async function SubscribeInterceptPage() {
  await connection();

  return <SubscribeModal key={randomUUID()} />;
}
