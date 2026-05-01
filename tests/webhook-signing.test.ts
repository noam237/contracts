import { describe, it, expect } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookSignature,
  InMemoryIdempotencyKeyCache,
} from "../src/webhook-signing.js";

describe("signWebhookPayload", () => {
  it("returns a 64-char hex SHA-256 digest", () => {
    const sig = signWebhookPayload("hello", "secret");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(signWebhookPayload("hello", "secret")).toBe(
      signWebhookPayload("hello", "secret"),
    );
  });

  it("differs for different payloads", () => {
    expect(signWebhookPayload("a", "secret")).not.toBe(
      signWebhookPayload("b", "secret"),
    );
  });

  it("differs for different secrets", () => {
    expect(signWebhookPayload("payload", "s1")).not.toBe(
      signWebhookPayload("payload", "s2"),
    );
  });

  it("throws on empty secret", () => {
    expect(() => signWebhookPayload("payload", "")).toThrow();
  });
});

describe("verifyWebhookSignature", () => {
  const payload = JSON.stringify({ event: "x", payload: { id: 1 } });
  const secret = "shared-secret-1234";

  it("returns true for a valid signature", () => {
    const sig = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it("returns false for the wrong secret", () => {
    const sig = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(payload, sig, "another-secret")).toBe(false);
  });

  it("detects payload tampering", () => {
    const sig = signWebhookPayload(payload, secret);
    const tampered = payload.replace(`"id":1`, `"id":999`);
    expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
  });

  it("detects signature tampering", () => {
    const sig = signWebhookPayload(payload, secret);
    // Flip a single hex char (with wraparound 'f' -> '0').
    const lastChar = sig[sig.length - 1] as string;
    const flipped =
      sig.slice(0, -1) + (lastChar === "f" ? "0" : String.fromCharCode(lastChar.charCodeAt(0) + 1));
    expect(verifyWebhookSignature(payload, flipped, secret)).toBe(false);
  });

  it("returns false for null / empty signature", () => {
    expect(verifyWebhookSignature(payload, null, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, "", secret)).toBe(false);
  });

  it("returns false for non-hex signature", () => {
    expect(verifyWebhookSignature(payload, "not-hex-zzzz", secret)).toBe(false);
  });

  it("returns false when secret is empty", () => {
    const sig = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(payload, sig, "")).toBe(false);
  });

  it("returns false on length mismatch", () => {
    expect(verifyWebhookSignature(payload, "abcd", secret)).toBe(false);
  });
});

describe("InMemoryIdempotencyKeyCache", () => {
  it("returns false for unseen keys", async () => {
    const cache = new InMemoryIdempotencyKeyCache();
    expect(await cache.has("never-seen")).toBe(false);
  });

  it("returns true after add()", async () => {
    const cache = new InMemoryIdempotencyKeyCache();
    await cache.add("key-1");
    expect(await cache.has("key-1")).toBe(true);
  });

  it("respects TTL — expired keys read as not-present", async () => {
    const cache = new InMemoryIdempotencyKeyCache(10);
    await cache.add("k", 5); // 5ms TTL
    await new Promise((r) => setTimeout(r, 20));
    expect(await cache.has("k")).toBe(false);
  });

  it("uses default TTL when none is provided", async () => {
    const cache = new InMemoryIdempotencyKeyCache(50);
    await cache.add("k");
    expect(await cache.has("k")).toBe(true);
  });
});
