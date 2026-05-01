import { describe, it, expect } from "vitest";
import {
  makeServiceAuthHeader,
  verifyServiceAuthHeader,
} from "../src/auth.js";

describe("makeServiceAuthHeader", () => {
  it("produces { Authorization: 'Bearer <key>' }", () => {
    expect(makeServiceAuthHeader("abc123")).toEqual({
      Authorization: "Bearer abc123",
    });
  });

  it("throws on empty key", () => {
    expect(() => makeServiceAuthHeader("")).toThrow();
  });
});

describe("verifyServiceAuthHeader", () => {
  it("returns true for matching header", () => {
    const key = "super-secret-service-key";
    const { Authorization } = makeServiceAuthHeader(key);
    expect(verifyServiceAuthHeader(Authorization, key)).toBe(true);
  });

  it("returns false for mismatched key", () => {
    const { Authorization } = makeServiceAuthHeader("key-one");
    expect(verifyServiceAuthHeader(Authorization, "key-two")).toBe(false);
  });

  it("returns false when keys differ in length", () => {
    expect(verifyServiceAuthHeader("Bearer short", "much-longer-key-value")).toBe(false);
  });

  it("returns false for null / undefined / empty header", () => {
    expect(verifyServiceAuthHeader(null, "k")).toBe(false);
    expect(verifyServiceAuthHeader(undefined, "k")).toBe(false);
    expect(verifyServiceAuthHeader("", "k")).toBe(false);
  });

  it("returns false when scheme is missing", () => {
    expect(verifyServiceAuthHeader("just-the-token", "just-the-token")).toBe(false);
  });

  it("returns false when scheme is wrong", () => {
    expect(verifyServiceAuthHeader("Basic abc123", "abc123")).toBe(false);
  });

  it("is case-insensitive on the scheme name", () => {
    const key = "k123";
    expect(verifyServiceAuthHeader(`bearer ${key}`, key)).toBe(true);
    expect(verifyServiceAuthHeader(`BEARER ${key}`, key)).toBe(true);
  });

  it("returns false when expected key is empty", () => {
    expect(verifyServiceAuthHeader("Bearer abc", "")).toBe(false);
  });
});
