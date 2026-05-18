/**
 * Historic product-purchase replay REST contracts.
 *
 * One-shot backfill channel: the CRM streams every completed historic order
 * (back to 2016 — Salesforce, WooCommerce and native) to the ERP so the ERP
 * has a realistic chronological flow of product demand over time.
 *
 * These rows land in a dedicated ERP `HistoricPurchase` table — they are a
 * sales-history / demand dataset and MUST NOT touch the inventory ledger
 * (`InventoryTransaction`) or current on-hand stock.
 *
 * Endpoints (ERP side, `Authorization: Bearer <SERVICE_API_KEY>`):
 *   POST /api/historic-purchases/reset   — wipe a previous replay run
 *   POST /api/historic-purchases/ingest  — append a chronological batch
 *
 * Idempotency: the ERP dedupes by (replayRunId, orderNumber, sku). Re-sending
 * a batch is safe. A run is identified by a caller-generated `replayRunId`.
 */

import { z } from "zod";

/** Stable identifier for one end-to-end replay run. */
export const ReplayRunIdSchema = z.string().min(1);
export type ReplayRunId = z.infer<typeof ReplayRunIdSchema>;

// ── A single purchased product line ──
// Lines are post-kit-explosion: a bundle/gift-set is expanded into its
// component products, each tagged with the originating bundle SKU. The CRM
// aggregates quantity per (order, sku) before sending, so a SKU never
// repeats within one event.

export const HistoricPurchaseLineSchema = z.object({
  /** Resolved product SKU (canonical current SKU where the product is known). */
  sku: z.string().min(1),
  productName: z.string().optional(),
  /** Units purchased. Must be > 0. */
  quantity: z.number().positive(),
  /** Per-unit price, ex-VAT, in ILS. Optional — older imports may lack it. */
  unitPrice: z.number().nonnegative().optional(),
  /** Set when this line was produced by exploding a kit/bundle SKU. */
  parentBundleSku: z.string().min(1).optional(),
});
export type HistoricPurchaseLine = z.infer<typeof HistoricPurchaseLineSchema>;

// ── One historic order ──

export const HistoricPurchaseEventSchema = z.object({
  /** CRM order number — the cross-system identity / idempotency key. */
  orderNumber: z.string().min(1),
  /** True historic purchase date (confirmedAt ?? paidAt ?? createdAt). */
  occurredAt: z.string().datetime({ offset: true }),
  /** "B2B" | "DTC" — the sales channel, when known. */
  channel: z.string().optional(),
  /** CRM OrderStatus at replay time, for downstream refinement. */
  orderStatus: z.string().optional(),
  lines: z.array(HistoricPurchaseLineSchema).min(1),
});
export type HistoricPurchaseEvent = z.infer<typeof HistoricPurchaseEventSchema>;

// ── POST /api/historic-purchases/ingest ──

export const HistoricPurchaseIngestRequestSchema = z.object({
  replayRunId: ReplayRunIdSchema,
  events: z.array(HistoricPurchaseEventSchema).min(1),
});
export type HistoricPurchaseIngestRequest = z.infer<
  typeof HistoricPurchaseIngestRequestSchema
>;

export const HistoricPurchaseIngestResponseSchema = z.object({
  data: z.object({
    ok: z.boolean(),
    /** Rows actually inserted (after dedupe). */
    ingested: z.number().int().nonnegative(),
    /** Rows skipped as already present for this run. */
    skipped: z.number().int().nonnegative(),
    /** Distinct SKUs that matched no ERP catalog Item (stored, itemId null). */
    unmatchedSkus: z.array(z.string()),
  }),
});
export type HistoricPurchaseIngestResponse = z.infer<
  typeof HistoricPurchaseIngestResponseSchema
>;

// ── POST /api/historic-purchases/reset ──
// Clears every row from a prior replay (source = CRM_HISTORIC_REPLAY) so the
// ERP can rebuild the historic ledger cleanly. Does not touch live data.

export const HistoricPurchaseResetRequestSchema = z.object({
  replayRunId: ReplayRunIdSchema,
});
export type HistoricPurchaseResetRequest = z.infer<
  typeof HistoricPurchaseResetRequestSchema
>;

export const HistoricPurchaseResetResponseSchema = z.object({
  data: z.object({
    ok: z.boolean(),
    /** Rows removed by the reset. */
    clearedCount: z.number().int().nonnegative(),
  }),
});
export type HistoricPurchaseResetResponse = z.infer<
  typeof HistoricPurchaseResetResponseSchema
>;
