/**
 * Stock REST contracts — the inter-service stock endpoints the ERP exposes and
 * the CRM consumes.
 *
 * These describe the endpoints **as implemented** (verified against the ERP
 * `web/src/app/api/stock/*` handlers and the CRM `src/lib/erp-bridge.ts`), not
 * an aspirational design. Earlier revisions of this file documented a richer,
 * never-built shape (per-item URLs, `reference`/`reservationId`, response
 * envelopes); that drift has been corrected here.
 *
 * All endpoints require `Authorization: Bearer <SERVICE_API_KEY>`.
 *
 * Lifecycle: **reserve** holds stock (writes a negative ISSUE transaction in the
 * MAIN warehouse immediately and returns its id) → **deduct** confirms at pack
 * time (annotation only — the balance already dropped at reserve) → **release**
 * reverses a hold on cancellation (writes a positive RETURN). Quantities are in
 * the item's base unit (finished goods = units).
 */

import { z } from "zod";

/** An ERP `InventoryTransaction.id` — returned by reserve, passed to deduct/release. */
export const ReservationIdSchema = z.string().min(1);
export type ReservationId = z.infer<typeof ReservationIdSchema>;

// ── POST /api/stock/reserve ──
// Holds stock and returns the ISSUE transaction id. Returns success:false (with
// HTTP 200) when stock is insufficient — callers must check the body, not the
// status. Concurrent reserves for one item are serialized server-side.

export const ReserveStockRequestSchema = z.object({
  itemId: z.string().min(1),
  /** Quantity to hold, in the item's base unit. Must be > 0. */
  quantity: z.number().positive(),
  /** CRM order id — stored as the transaction's documentId for audit. */
  orderId: z.string().min(1),
  /**
   * Optional stable per-line idempotency key. A repeat with the same key
   * returns the original reservation instead of reducing stock again, so a
   * retried call after a lost response is safe.
   */
  idempotencyKey: z.string().min(1).max(200).optional(),
});
export type ReserveStockRequest = z.infer<typeof ReserveStockRequestSchema>;

export const ReserveStockResponseSchema = z.object({
  success: z.boolean(),
  /** The ISSUE transaction id; empty string when success is false. */
  transactionId: z.string(),
  /** Available quantity remaining after the reservation. */
  availableAfter: z.number(),
});
export type ReserveStockResponse = z.infer<typeof ReserveStockResponseSchema>;

// ── POST /api/stock/deduct ──
// Marks a reservation confirmed at pack time. NOTE: stock already dropped at
// reserve, so this does NOT change the balance — it only annotates the row.

export const DeductStockRequestSchema = z.object({
  transactionId: ReservationIdSchema,
  orderId: z.string().min(1),
});
export type DeductStockRequest = z.infer<typeof DeductStockRequestSchema>;

export const DeductStockResponseSchema = z.object({ success: z.boolean() });
export type DeductStockResponse = z.infer<typeof DeductStockResponseSchema>;

// ── POST /api/stock/release ──
// Reverses a reservation (writes a positive RETURN) on order cancellation.

export const ReleaseStockRequestSchema = z.object({
  transactionId: ReservationIdSchema,
  orderId: z.string().min(1),
});
export type ReleaseStockRequest = z.infer<typeof ReleaseStockRequestSchema>;

export const ReleaseStockResponseSchema = z.object({ success: z.boolean() });
export type ReleaseStockResponse = z.infer<typeof ReleaseStockResponseSchema>;

// ── Read path ──
// There is no per-item GET stock endpoint. To refresh its local stock view the
// CRM polls `GET /api/inventory/finished-goods` (Bearer SERVICE_API_KEY,
// INVENTORY_VIEW), which returns a velocity list: one row per active finished
// good with `currentStock` (sum of InventoryTransaction quantity, in units),
// `avgDailyConsumption`, `safetyStock`, and `daysUntilDepletion`, plus a summary.
// It is a reporting endpoint, not a contract surface — kept here only as a pointer.
