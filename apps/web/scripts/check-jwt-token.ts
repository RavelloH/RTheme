// script/check-jwt-token.ts
// Check JWT key pair validity

import type { KeyObject } from "crypto";
import { createPrivateKey, createPublicKey, generateKeyPairSync } from "crypto";
import type { SignOptions, VerifyOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import Rlog from "rlog-js";
import { pathToFileURL } from "url";

import { loadWebEnv } from "@/../scripts/load-env";

// Load .env* from apps/web and repo root.
loadWebEnv();

const rlog = new Rlog();

const PEM_PREFIX = "-----";
const BASE64_KEY_PATTERN = /^[A-Za-z0-9+/=_-]+$/;

function normalizeJwtKey(value: string): string {
  const unescaped = value.replace(/\\n/g, "\n").trim();
  if (!unescaped) {
    return "";
  }

  if (unescaped.startsWith(PEM_PREFIX)) {
    return unescaped;
  }

  const compact = unescaped.replace(/\s+/g, "");
  if (!BASE64_KEY_PATTERN.test(compact)) {
    return unescaped;
  }

  const normalizedBase64 = compact.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalizedBase64.padEnd(
    normalizedBase64.length + ((4 - (normalizedBase64.length % 4)) % 4),
    "=",
  );

  try {
    const decoded = Buffer.from(padded, "base64").toString("utf8").trim();
    if (decoded.startsWith(PEM_PREFIX)) {
      return decoded;
    }
  } catch {
    // ignore invalid base64
  }

  return unescaped;
}

// JWT key pair validation function
function validateJWTKeyPair(
  privateKeyPem: string,
  publicKeyPem: string,
): string | null {
  try {
    // Try to create key objects
    const privateKey: KeyObject = createPrivateKey({
      key: privateKeyPem,
      format: "pem",
    });

    const publicKey: KeyObject = createPublicKey({
      key: publicKeyPem,
      format: "pem",
    });

    // Create test payload
    const testPayload = {
      test: "jwt-validation",
      timestamp: Date.now(),
    };

    // Sign with private key
    const signOptions: SignOptions = {
      algorithm: "ES256",
      header: {
        typ: "JWT",
        alg: "ES256",
      } as SignOptions["header"],
      expiresIn: "1h",
    };

    const token = jwt.sign(testPayload, privateKey, signOptions);

    // Verify with public key
    const verifyOptions: VerifyOptions = {
      algorithms: ["ES256"],
    };

    const decoded = jwt.verify(token, publicKey, verifyOptions);

    // Verify decoded data contains test payload
    if (typeof decoded === "object" && decoded !== null && "test" in decoded) {
      const decodedTest = decoded as { test: string };
      if (decodedTest.test !== testPayload.test) {
        return "JWT signature verification succeeded but payload mismatch";
      }
    } else {
      return "JWT decoding failed or incorrect format";
    }

    return null; // Validation succeeded
  } catch (error) {
    if (error instanceof Error) {
      return `JWT key pair validation failed: ${error.message}`;
    }
    return "JWT key pair validation failed: unknown error";
  }
}

// Generate new JWT key pair
function generateJWTKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1", // P-256 for ES256
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    privateKey,
    publicKey,
  };
}

// Exported JWT check function
export async function checkJWTKeyPair(): Promise<void> {
  rlog.info("> Checking if JWT key pair is valid...");

  const jwtPrivateKey = normalizeJwtKey(process.env.JWT_PRIVATE_KEY!);
  const jwtPublicKey = normalizeJwtKey(process.env.JWT_PUBLIC_KEY!);

  const keyPairError = validateJWTKeyPair(jwtPrivateKey, jwtPublicKey);
  if (keyPairError) {
    rlog.error(`✗ JWT key pair validation failed: ${keyPairError}`);
    rlog.warning("  Generating a new JWT key pair for you...");

    const { privateKey, publicKey } = generateJWTKeyPair();

    rlog.success("✓ New JWT key pair generated successfully!");
    rlog.log("  Please replace the keys in your .env file with these:");
    rlog.log();
    rlog.info('  JWT_PRIVATE_KEY="' + privateKey.replace(/\n/g, "\\n") + '"');
    rlog.info('  JWT_PUBLIC_KEY="' + publicKey.replace(/\n/g, "\\n") + '"');
    rlog.log();
    rlog.log("  Or use base64-encoded PEM (single-line env values):");
    rlog.info(
      `  JWT_PRIVATE_KEY=${Buffer.from(privateKey, "utf8").toString("base64")}`,
    );
    rlog.info(
      `  JWT_PUBLIC_KEY=${Buffer.from(publicKey, "utf8").toString("base64")}`,
    );
    rlog.log();

    throw new Error(
      "JWT key pair validation failed - new keys generated above",
    );
  }

  rlog.success("✓ JWT key pair validation completed");
}

// Main entry function
async function main() {
  try {
    await checkJWTKeyPair();
  } catch (error) {
    rlog.error(
      `JWT check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

// Check if this is the main module
function isMainModule(): boolean {
  try {
    const arg1 = process.argv[1];
    return (
      import.meta.url === pathToFileURL(arg1 || "").href ||
      (arg1?.endsWith("check-jwt-token.ts") ?? false) ||
      (arg1?.endsWith("check-jwt-token.js") ?? false)
    );
  } catch {
    return false;
  }
}

// If running this script directly
if (isMainModule()) {
  main();
}
