import "server-only";

import { randomUUID } from "crypto";

import SubscribeModal from "@/app/@modal/(.)subscribe/SubscribeModal";

export default function SubscribeInterceptPage() {
  return <SubscribeModal key={randomUUID()} />;
}
