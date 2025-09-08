function generate(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const timestamp = Date.now();
  return code + "-" + timestamp;
}

function verify(
  code: string,
  validDurationMs: number = 15 * 60 * 1000
): boolean {
  const parts = code.split("-");
  if (parts.length !== 2) return false;
  const timestamp = parseInt(parts[1]!, 10);
  if (isNaN(timestamp)) return false;
  return Date.now() - timestamp <= validDurationMs;
}

const emailUtils = {
  generate,
  verify,
};

export default emailUtils;
