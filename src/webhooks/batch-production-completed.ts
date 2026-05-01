/**
 * `batch_production.completed` — emitted by ERP after a BatchProduction
 * transitions to COMPLETED.
 *
 * Source of truth: ERP `web/src/app/api/batch-production/[id]/route.ts`
 *   dispatchWebhook("batch_production.completed", {
 *     batchProductionId, batchNumber, itemId, batchSizeKg
 *   })
 */

import { z } from "zod";

export const BatchProductionCompletedPayloadSchema = z.object({
  /** BatchProduction.id (cuid). */
  batchProductionId: z.string().min(1),

  /** Human-readable batch number, e.g. "B-2026-0042". */
  batchNumber: z.string().min(1),

  /** Item.id of the finished/semi-finished good produced. */
  itemId: z.string().min(1),

  /** Planned batch size in kilograms (Decimal serialized as number). */
  batchSizeKg: z.number().positive(),

  // TODO — align with CRM consumer: include actualUnits and resulting
  // availableQty so CRM can refresh its productCatalog without a
  // follow-up call to ERP. Likely shape once aligned:
  //   actualUnits: z.number().int().nonnegative().optional(),
  //   sku: z.string(),
  //   availableQty: z.number(),
});
export type BatchProductionCompletedPayload = z.infer<
  typeof BatchProductionCompletedPayloadSchema
>;

export const BatchProductionCompletedEventSchema = z.object({
  event: z.literal("batch_production.completed"),
  timestamp: z.string().datetime({ offset: true }),
  idempotencyKey: z.string().min(1),
  payload: BatchProductionCompletedPayloadSchema,
});
export type BatchProductionCompletedEvent = z.infer<
  typeof BatchProductionCompletedEventSchema
>;
