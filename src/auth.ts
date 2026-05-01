/**
 * Inter-service auth helpers.
 *
 * Every Sabon Michal service-to-service REST call carries a static
 * bearer token from the env var `SERVICE_API_KEY`. These helpers
 * standardise the header construction and verification so the
 * shape (and the timing-safe comparison) cannot drift between
 * caller and callee.
 *
 * For PUBLIC-facing endpoints, use a real auth scheme (sessions,
 * OAuth, etc.) — this module is for trusted ERP↔CRM↔store traffic
 * over `*.railway.internal` only.
 */

import { timingSafeEqual } from "node:crypto";

/** Build the Authorization header carrying the service key. */
export function makeServiceAuthHeader(key: string): { Authorization: string } {
  if (!key) {
    throw new Error("makeServiceAuthHeader: key must be a non-empty string");
  }
  return { Authorization: `Bearer ${key}` };
}

/**
 * Constant-time verification of an Authorization header against the
 * expected service key. Returns false (not throws) on any malformed
 * input so callers can branch on a single boolean.
 */
export function verifyServiceAuthHeader(
  header: string | null | undefined,
  key: string,
): boolean {
  if (!header || !key) return false;
  if (typeof header !== "string") return false;

  // Expect "Bearer <token>" — case-insensitive scheme name.
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  const presented = match[1] as string;

  // Encode both sides to Buffers of equal length for timingSafeEqual.
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(key, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
