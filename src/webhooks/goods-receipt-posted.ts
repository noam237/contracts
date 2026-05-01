/**
 * `goods_receipt.posted` — emitted by ERP after a GoodsReceipt is POSTED.
 *
 * Source of truth: ERP `web/src/app/api/goods-receipts/route.ts`
 *   dispatchWebhook("goods_receipt.posted", {
 *     goodsReceiptId, number, purchaseOrderId, itemIds: string[]
 *   })
 *
 * Receiver: CRM `src/lib/webhook-processors.ts` → `processErpWebhook`
 *
 * NOTE — drift between current ERP emit shape and CRM receive shape:
 *   The current CRM receiver (src/app/api/webhooks/erp/route.ts) expects
 *   a flat body { event, itemId, sku?, availableQty?, incomingQty?, ... }
 *   rather than the canonical { event, timestamp, idempotencyKey, payload }
 *   envelope. This package defines the canonical envelope; both consumers
 *   must align to it as part of the migration to @sabonmichal/contracts.
 *
 *   The payload below matches what ERP CURRENTLY emits. Quantity fields
 *   that the CRM consumes (availableQty, incomingQty) are listed as
 *   OPTIONAL and TODO — to be added on the ERP side as part of contract
 *   alignment so the CRM can update its product catalog without an extra
 *   round-trip API call.
 */

import { z } from "zod";

export const GoodsReceiptPostedPayloadSchema = z.object({
  /** GoodsReceipt.id (cuid). */
  goodsReceiptId: z.string().min(1),

  /** Human-readable document number, e.g. "GR-2026-0001". */
  number: z.string().min(1),

  /** PurchaseOrder.id this receipt was posted against. */
  purchaseOrderId: z.string().min(1),

  /** De-duplicated list of Item.id values touched by this receipt. */
  itemIds: z.array(z.string().min(1)).min(1),

  // TODO — align with CRM consumer: ERP should populate per-item stock
  // snapshots so CRM doesn't need a follow-up `getStock` call. Today CRM
  // expects (per processErpWebhook): availableQty, incomingQty, transactionId.
  // Likely shape once aligned:
  //   items: z.array(z.object({
  //     itemId: z.string(),
  //     sku: z.string(),
  //     availableQty: z.number(),
  //     incomingQty: z.number(),
  //   })),
  //   transactionId: z.string(), // ERP InventoryTransaction.id, for idempotency
});
export type GoodsReceiptPostedPayload = z.infer<
  typeof GoodsReceiptPostedPayloadSchema
>;

export const GoodsReceiptPostedEventSchema = z.object({
  event: z.literal("goods_receipt.posted"),
  timestamp: z.string().datetime({ offset: true }),
  idempotencyKey: z.string().min(1),
  payload: GoodsReceiptPostedPayloadSchema,
});
export type GoodsReceiptPostedEvent = z.infer<
  typeof GoodsReceiptPostedEventSchema
>;
