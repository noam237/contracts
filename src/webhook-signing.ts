/**
 * Webhook signing + idempotency primitives.
 *
 * Senders compute `signWebhookPayload(rawBody, secret)` and ship the
 * result as the `X-Sabonmichal-Signature` header alongside the body.
 * Receivers re-compute and compare with `verifyWebhookSignature` —
 * which is timing-safe — before parsing the JSON.
 *
 * The shared secret lives in env (`WEBHOOK_SIGNING_SECRET`). It is
 * NOT the same as `SERVICE_API_KEY`: the bearer key authenticates the
 * caller; the signing secret authenticates the body bytes (so a
 * proxy cannot tamper with payload while keeping the bearer header).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const HEX_REGEX = /^[0-9a-f]+$/i;

/**
 * Compute a hex-encoded HMAC-SHA256 of the raw payload.
 * Pass the EXACT bytes the receiver will see — i.e. the request body
 * string before JSON.parse. Re-serialising via JSON.stringify after
 * parsing will produce a different signature.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  if (!secret) {
    throw new Error("signWebhookPayload: secret must be a non-empty string");
  }
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Verify a signature against a payload and secret. Returns false on
 * any error or mismatch — never throws — so callers can branch
 * cleanly. Comparison is constant-time.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  if (typeof signature !== "string") return false;
  if (!HEX_REGEX.test(signature)) return false;

  const expected = signWebhookPayload(payload, secret);
  // Both sides are hex of the same digest length (64 chars for SHA-256).
  if (expected.length !== signature.length) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Pluggable idempotency-key store. Receivers should call `has(key)`
 * before processing; if true, ack the webhook without re-running the
 * effect. After successful processing, call `add(key, ttlMs)`.
 *
 * Implementations:
 *   - Production: Redis SETNX with TTL (~24h).
 *   - Tests: in-memory Map (see tests/ for an example).
 */
export interface IdempotencyKeyCache {
  /** Has this key been seen and recorded? */
  has(key: string): Promise<boolean>;

  /**
   * Record a key as seen. Optional TTL in milliseconds — if omitted,
   * the implementation's default (typically 24h) applies.
   */
  add(key: string, ttlMs?: number): Promise<void>;
}

/**
 * Simple in-memory implementation of IdempotencyKeyCache. Useful for
 * tests and single-process workers; do NOT use in horizontally
 * scaled production deployments — keys won't be visible across
 * instances.
 */
export class InMemoryIdempotencyKeyCache implements IdempotencyKeyCache {
  private readonly store = new Map<string, number>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 24 * 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  async has(key: string): Promise<boolean> {
    const expiresAt = this.store.get(key);
    if (expiresAt === undefined) return false;
    if (expiresAt <= Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async add(key: string, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, Date.now() + ttl);
  }
}
