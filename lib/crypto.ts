import crypto from "crypto";
import { env } from "./env";

/**
 * Criptografia simétrica AES-256-GCM para secrets em repouso
 * (tokens de integração, Meta, etc). Formato armazenado:
 *   v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 */

const ALGO = "aes-256-gcm";
const VERSION = "v1";

function deriveKey(secret: string): Buffer {
  // Aceita base64 (32 bytes) ou deriva via sha256 de qualquer string.
  try {
    const raw = Buffer.from(secret, "base64");
    if (raw.length === 32) return raw;
  } catch {
    /* fallthrough */
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(
  plaintext: string,
  secret: string = env.encryptionKey,
): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(
  payload: string,
  secret: string = env.encryptionKey,
): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Formato de secret inválido");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Hash unidirecional (SHA-256) para tokens de sessão/convite/reset. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Gera token aleatório seguro (url-safe). */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Mascara um valor sensível para exibição (ex.: tok_****cd12). */
export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}
