/**
 * Shared enums — ported verbatim from the ERP Prisma schema
 * (`prisma/schema.prisma`). Keep in sync when the ERP schema
 * evolves; a value rename here is a breaking change for every
 * consumer.
 *
 * Each enum is exposed both as a Zod schema (for runtime validation)
 * and as a derived TS type (for compile-time checks).
 */

import { z } from "zod";

// ── Currency ─────────────────────────────────────────────────────────

export const CurrencySchema = z.enum(["ILS", "USD", "EUR", "GBP"]);
export type Currency = z.infer<typeof CurrencySchema>;

// ── ItemType ─────────────────────────────────────────────────────────

export const ItemTypeSchema = z.enum([
  "RAW_MATERIAL",   // חומר גלם
  "PACKAGING",      // חומר אריזה
  "OPERATIONAL",    // מלאי תפעולי
  "FINISHED_GOOD",  // תוצרת גמורה
  "SEMI_FINISHED",  // חצי מוצר
]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

// ── BOMComponentType ─────────────────────────────────────────────────

export const BOMComponentTypeSchema = z.enum([
  "RAW_MATERIAL",   // אחוז מהפורמולה
  "PACKAGING",      // יחידות לכל מוצר
  "OPERATIONAL",    // יחידות לכל מוצר
  "SEMI_FINISHED",  // אחוז מהפורמולה
]);
export type BOMComponentType = z.infer<typeof BOMComponentTypeSchema>;

// ── TransactionType ──────────────────────────────────────────────────

export const TransactionTypeSchema = z.enum([
  "RECEIPT",     // קליטה מספק
  "ISSUE",       // ניפוק לייצור
  "ADJUSTMENT",  // התאמת מלאי
  "RETURN",      // החזרה
  "PRODUCTION",  // כניסה מייצור
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// ── WOStatus (Work Order / Batch Production) ─────────────────────────

export const WOStatusSchema = z.enum([
  "DRAFT",
  "PLANNED",
  "IN_PRODUCTION",
  "COMPLETED",
  "CANCELLED",
]);
export type WOStatus = z.infer<typeof WOStatusSchema>;

// ── CategoryType ─────────────────────────────────────────────────────

export const CategoryTypeSchema = z.enum([
  "INGREDIENT",  // קטגוריות חומרים
  "PRODUCT",     // קטגוריות מוצרים
]);
export type CategoryType = z.infer<typeof CategoryTypeSchema>;

// ── PurchasingMethod ─────────────────────────────────────────────────

export const PurchasingMethodSchema = z.enum([
  "NORMAL",
  "LONG_LEAD_TIME",
  "BLANKET_AGREEMENT",
]);
export type PurchasingMethod = z.infer<typeof PurchasingMethodSchema>;

// ── GoodsReceiptStatus ───────────────────────────────────────────────

export const GoodsReceiptStatusSchema = z.enum([
  "DRAFT",
  "POSTED",
  "CANCELED",
]);
export type GoodsReceiptStatus = z.infer<typeof GoodsReceiptStatusSchema>;
