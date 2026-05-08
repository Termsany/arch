import { createHash, randomBytes } from "node:crypto";
import { getEnv } from "./env";

export const INVITE_EXPIRY_DAYS = 7;

export type InviteTokenData = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
  inviteUrl: string;
};

function normalizeFrontendOrigin(): string {
  const raw = getEnv().frontendUrl.split(",")[0]?.trim() || "";
  return raw.replace(/\/$/, "");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createInviteToken(path = "/set-password"): InviteTokenData {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + INVITE_EXPIRY_DAYS);

  const inviteUrl = `${normalizeFrontendOrigin()}${path}?token=${encodeURIComponent(token)}`;

  return { token, tokenHash, expiresAt, inviteUrl };
}
