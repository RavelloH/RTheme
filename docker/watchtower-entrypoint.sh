#!/bin/sh
set -eu

master_secret="$(printf "%s" "${MASTER_SECRET:-}" | tr -d '\r\n')"
if [ -z "${master_secret}" ]; then
  echo "watchtower: MASTER_SECRET is required" >&2
  exit 1
fi

if [ "${#master_secret}" -lt 32 ]; then
  echo "watchtower: MASTER_SECRET length must be at least 32" >&2
  exit 1
fi

watchtower_token="$(MASTER_SECRET="${master_secret}" node <<'NODE'
const { hkdfSync } = require("node:crypto");

const masterSecret = (process.env.MASTER_SECRET || "").trim();
const derived = hkdfSync(
  "sha256",
  Buffer.from(masterSecret, "utf8"),
  Buffer.from("neutralpress", "utf8"),
  Buffer.from("watchtower-api-v1", "utf8"),
  32,
);
process.stdout.write(Buffer.from(derived).toString("base64url"));
NODE
)"

export WATCHTOWER_HTTP_API_TOKEN="${watchtower_token}"

exec /watchtower "$@"
