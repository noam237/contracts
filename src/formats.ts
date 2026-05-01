/**
 * Wire-format primitives — regex patterns + validators for cross-service
 * identifiers that must look identical in every system.
 *
 * Mirrors the formats produced by the ERP server-side generators:
 *   - SKU:               101-1<CategoryCode>-<sequence>     (web/src/lib/* + category-manager)
 *   - Document number:   <PREFIX>-<YEAR>-<padded-sequence>  (web/src/lib/document-number.ts)
 */

import { z } from "zod";

// ── SKU ──────────────────────────────────────────────────────────────
// CategoryCode is 1-2 uppercase letters (e.g. "A", "FL", "BF").
// Sequence is one or more digits, server-side padded for display
// but stored as printed (e.g. "101-1A-001", "101-1FL-042").

/**
 * SKU regex. Matches the format produced by ERP server-side from
 * ItemCategory.code. Examples:
 *   - 101-1A-001     (Category "A",  seq 001)
 *   - 101-1FL-042    (Category "FL", seq 042)
 *   - 101-1BF-1234   (Category "BF", seq 1234)
 */
export const SKU_REGEX = /^101-1[A-Z]{1,2}-\d+$/;

export const SkuSchema = z
  .string()
  .regex(SKU_REGEX, "SKU must match format 101-1<CategoryCode>-<sequence>");
export type Sku = z.infer<typeof SkuSchema>;

/** Validate a SKU string. */
export function isValidSku(value: string): boolean {
  return SKU_REGEX.test(value);
}

// ── Document number ──────────────────────────────────────────────────
// Per ERP web/src/lib/document-number.ts, the prefix list is:
//   PO-, GR-, ADJ-, BO-, RTV-, DEV-, LT-, EXT-, WT-, CC-, BS-, BM-, PLAN-
// Year is the 4-digit Gregorian year, sequence is left-padded with
// zeros (default padding 4 — e.g. "PO-2026-0001"). The ERP can
// re-configure padding per series, so we accept any digit count >= 1.

/**
 * Document number regex. Matches "<PREFIX>-<YEAR>-<sequence>".
 *   - PREFIX:   1+ uppercase letters
 *   - YEAR:     exactly 4 digits
 *   - sequence: 1+ digits (padded server-side; pad width is per-series)
 *
 * Examples: "PO-2026-0001", "GR-2026-0042", "PLAN-2026-000123"
 */
export const DOCUMENT_NUMBER_REGEX = /^[A-Z]+-\d{4}-\d+$/;

export const DocumentNumberSchema = z
  .string()
  .regex(
    DOCUMENT_NUMBER_REGEX,
    "Document number must match format <PREFIX>-<YEAR>-<sequence>",
  );
export type DocumentNumber = z.infer<typeof DocumentNumberSchema>;

/** Validate a document number string. */
export function isValidDocumentNumber(value: string): boolean {
  return DOCUMENT_NUMBER_REGEX.test(value);
}

/**
 * Parse a document number into its parts. Returns null if the string
 * doesn't match the expected format.
 */
export function parseDocumentNumber(
  value: string,
): { prefix: string; year: number; sequence: number } | null {
  const match = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(value);
  if (!match) return null;
  // Indices 1-3 are guaranteed by the match.
  const prefix = match[1] as string;
  const yearStr = match[2] as string;
  const seqStr = match[3] as string;
  return {
    prefix,
    year: Number.parseInt(yearStr, 10),
    sequence: Number.parseInt(seqStr, 10),
  };
}
