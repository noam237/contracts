/**
 * `inventory.adjusted` — emitted by ERP whenever an inventory adjustment
 * (manual count correction, expiry write-off, damage, etc.) creates an
 * InventoryTransaction of type ADJUSTMENT.
 *
 * Source of truth: ERP webhook event name registered in
 *   `web/src/lib/webhooks.ts` (event union: "inventory.adjusted")
 *
 * The ERP currently does not have a call site for this event in the
 * codebase — only the type union declares it. The shape below matches
 * what the CRM receiver (`processErpWebhook`) ALREADY consumes:
 *   { itemId, sku?, adjustedQty?, availableQty?, transactionId? }
 *
 * TODO — add the ERP-side dispatch call inside the
 * inventory-adjustment route handler when that endpoint lands.
 */

import { z } from "zod";

export const InventoryAdjustedPayloadSchema = z.object({
  /** Item.id whose stock was adjusted. */
  itemId: z.string().min(1),

  /** Item.sku, included for cross-system lookup convenience. */
  sku: z.string().optional(),

  /**
   * The new available quantity for the item AFTER the adjustment
   * (in the item's base unit). Preferred over availableQty when both
   * are present.
   */
  adjustedQty: z.number().optional(),

  /**
   * Total available quantity across all warehouses/batches AFTER the
   * adjustment. Used as a fallback if `adjustedQty` is not provided.
   */
  availableQty: z.number().optional(),

  /**
   * The InventoryTransaction.id that recorded this adjustment.
   * Receivers should use this for idempotency keying so retries don't
   * double-apply the change.
   */
  transactionId: z.string().optional(),
});
export type InventoryAdjustedPayload = z.infer<
  typeof InventoryAdjustedPayloadSchema
>;

export const InventoryAdjustedEventSchema = z.object({
  event: z.literal("inventory.adjusted"),
  timestamp: z.string().datetime({ offset: true }),
  idempotencyKey: z.string().min(1),
  payload: InventoryAdjustedPayloadSchema,
});
export type InventoryAdjustedEvent = z.infer<
  typeof InventoryAdjustedEventSchema
>;
