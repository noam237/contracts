/**
 * Stock REST contracts — request/response schemas for the inter-service
 * stock query and reservation endpoints exposed by the ERP and consumed
 * by the CRM (and the future store).
 *
 * TODO: align with ERP /api/items/{id}/stock — these endpoints do not
 * yet exist on the ERP side. The schemas below are the contract we
 * want them to fulfill. Implementation order:
 *   1. ERP exposes GET  /api/items/{itemId}/stock         (getStock)
 *   2. ERP exposes POST /api/items/{itemId}/stock/reserve (reserveStock)
 *   3. ERP exposes POST /api/items/{itemId}/stock/release (releaseStock)
 *   4. ERP exposes POST /api/items/{itemId}/stock/deduct  (deductStock)
 *   5. CRM swaps direct DB lookups for these calls.
 *
 * All endpoints require `Authorization: Bearer <SERVICE_API_KEY>`.
 */

import { z } from "zod";

// ── Common ──

/**
 * A reservation handle. Returned by reserveStock, accepted by
 * releaseStock and deductStock so the ERP can roll back or commit
 * the right rows.
 */
export const ReservationIdSchema = z.string().min(1);
export type ReservationId = z.infer<typeof ReservationIdSchema>;

// ── GET /api/items/{itemId}/stock ──

export const GetStockRequestSchema = z.object({
  itemId: z.string().min(1),
});
export type GetStockRequest = z.infer<typeof GetStockRequestSchema>;

export const GetStockResponseSchema = z.object({
  data: z.object({
    itemId: z.string(),
    sku: z.string(),
    /** Sum of all InventoryTransaction rows for the item, in base unit. */
    onHandQty: z.number(),
    /** onHandQty minus the sum of currently-active reservations. */
    availableQty: z.number(),
    /** Sum of expected incoming receipts (open POs + in-transit). */
    incomingQty: z.number(),
    /** ISO timestamp of the snapshot. */
    asOf: z.string().datetime({ offset: true }),
  }),
});
export type GetStockResponse = z.infer<typeof GetStockResponseSchema>;

// ── POST /api/items/{itemId}/stock/reserve ──

export const ReserveStockRequestSchema = z.object({
  itemId: z.string().min(1),
  /** Quantity to hold, in the item's base unit. Must be > 0. */
  quantity: z.number().positive(),
  /**
   * Caller-supplied reference, e.g. a CRM order id. Used so that
   * subsequent release/deduct calls can also locate the row by ref
   * without persisting the reservationId on the caller's side.
   */
  reference: z.string().min(1),
  /**
   * Optional reservation TTL. Reservations older than this are
   * eligible for automatic release. Defaults to 24h on the ERP side.
   */
  ttlSeconds: z.number().int().positive().optional(),
});
export type ReserveStockRequest = z.infer<typeof ReserveStockRequestSchema>;

export const ReserveStockResponseSchema = z.object({
  data: z.object({
    reservationId: ReservationIdSchema,
    itemId: z.string(),
    quantity: z.number().positive(),
    reservedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
  }),
});
export type ReserveStockResponse = z.infer<typeof ReserveStockResponseSchema>;

// ── POST /api/items/{itemId}/stock/release ──

export const ReleaseStockRequestSchema = z.object({
  itemId: z.string().min(1),
  /**
   * Either the reservationId returned by reserveStock, or the
   * caller-supplied reference, or both. At least one is required.
   */
  reservationId: ReservationIdSchema.optional(),
  reference: z.string().min(1).optional(),
}).refine(
  (v) => v.reservationId || v.reference,
  { message: "reservationId or reference is required" },
);
export type ReleaseStockRequest = z.infer<typeof ReleaseStockRequestSchema>;

export const ReleaseStockResponseSchema = z.object({
  data: z.object({
    released: z.boolean(),
    /** Quantity that was released (0 if nothing matched). */
    quantity: z.number().nonnegative(),
  }),
});
export type ReleaseStockResponse = z.infer<typeof ReleaseStockResponseSchema>;

// ── POST /api/items/{itemId}/stock/deduct ──
// Commits a previously-reserved hold by writing an ISSUE
// InventoryTransaction. This is the "convert reservation → real
// stock movement" step.

export const DeductStockRequestSchema = z.object({
  itemId: z.string().min(1),
  reservationId: ReservationIdSchema,
  /**
   * The actual deducted quantity. May be <= the original reservation
   * (e.g. partial fulfillment); ERP returns the remaining hold if any.
   */
  quantity: z.number().positive(),
  /** Document number of the originating CRM order/shipment, for audit. */
  documentNumber: z.string().min(1),
  notes: z.string().optional(),
});
export type DeductStockRequest = z.infer<typeof DeductStockRequestSchema>;

export const DeductStockResponseSchema = z.object({
  data: z.object({
    /** ERP InventoryTransaction.id created by the deduction. */
    transactionId: z.string(),
    deductedQty: z.number().positive(),
    /** Remaining quantity left on the reservation, 0 if fully consumed. */
    remainingReservedQty: z.number().nonnegative(),
  }),
});
export type DeductStockResponse = z.infer<typeof DeductStockResponseSchema>;
