import { createHash } from "node:crypto";

import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "yts_admin_session";

export function getAdminSecret() {
  return process.env.ADMIN_SECRET?.trim() ?? "";
}

export function isAdminConfigured() {
  return getAdminSecret().length > 0;
}

export function isValidAdminSecret(candidate: string) {
  const secret = getAdminSecret();
  return secret.length > 0 && candidate === secret;
}

export function createAdminSessionToken(secret: string) {
  return createHash("sha256").update(`yts-admin:${secret}`).digest("hex");
}

export function getExpectedAdminSessionToken() {
  const secret = getAdminSecret();
  if (!secret) return null;
  return createAdminSessionToken(secret);
}

export async function isAdminAuthenticated() {
  const expected = getExpectedAdminSessionToken();
  if (!expected) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === expected;
}
