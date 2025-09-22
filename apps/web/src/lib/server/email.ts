const MAX_VERIFY_DURATION = 15 * 60 * 1000; // 15分钟

function generate(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const timestamp = Date.now();
  return code + "-" + timestamp;
}

function verify(inputCode: string, storedCodeWithTimestamp: string): boolean {
  try {
    const [storedCode, timestampStr] = storedCodeWithTimestamp.split("-");
    const timestamp = parseInt(timestampStr || "", 10);

    return (
      storedCode === inputCode &&
      !isNaN(timestamp) &&
      Date.now() - timestamp <= MAX_VERIFY_DURATION
    );
  } catch {
    return false;
  }
}

const emailUtils = {
  generate,
  verify,
};

export default emailUtils;
