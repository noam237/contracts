/**
 * Error response shape + common error codes shared by every
 * Sabon Michal API.
 *
 * Per the ERP convention: error bodies are { error: <Hebrew string> }
 * — never { error: { code, message } } or { errors: [...] }. Keep it
 * a single string so consumers can surface it directly to the UI
 * without translation.
 */

import { z } from "zod";

export const ErrorResponseSchema = z.object({
  /** Hebrew, user-facing error message. */
  error: z.string().min(1),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Catalog of well-known error codes. These are SYMBOLIC tokens that
 * services can use internally for branching (e.g. "did this fail
 * because the user lacks permission, or because the row was deleted?")
 * even though the wire response only contains the Hebrew string.
 *
 * If a code is exposed on the wire in the future, it goes in a
 * separate `code` field next to `error`, never replacing it.
 */
export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",            // 401 — לא מחובר
  FORBIDDEN: "FORBIDDEN",                  // 403 — אין הרשאה
  NOT_FOUND: "NOT_FOUND",                  // 404 — הרשומה לא נמצאה
  DUPLICATE: "DUPLICATE",                  // 409 — ערך כפול בשדה
  DEPENDENT_RECORDS: "DEPENDENT_RECORDS",  // 409 — קיימים רשומות תלויות
  VALIDATION_ERROR: "VALIDATION_ERROR",    // 400 — קלט לא תקין
  CONFLICT: "CONFLICT",                    // 409 — סטטוס השתנה
  RATE_LIMITED: "RATE_LIMITED",            // 429 — יותר מדי בקשות
  INTERNAL: "INTERNAL",                    // 500 — שגיאת שרת פנימית
  BAD_GATEWAY: "BAD_GATEWAY",              // 502 — שירות חיצוני נכשל
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE", // 503 — שירות לא זמין
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Reverse lookup: HTTP status → most-likely ErrorCode (for clients). */
export const STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_ERROR,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.RATE_LIMITED,
  500: ErrorCode.INTERNAL,
  502: ErrorCode.BAD_GATEWAY,
  503: ErrorCode.SERVICE_UNAVAILABLE,
};
