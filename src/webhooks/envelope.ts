/**
 * Webhook envelope — the canonical wrapper that ALL Sabon Michal
 * inter-service webhooks travel in.
 *
 * Receivers MUST:
 *   1. Verify the `Authorization: Bearer <SERVICE_API_KEY>` header.
 *   2. Deduplicate by `idempotencyKey` (e.g. via Redis SETNX with a 24h TTL).
 *   3. Validate the envelope with `WebhookEnvelopeSchema` before
 *      branching on `event` to dispatch to the typed payload handler.
 *
 * The envelope is an explicit discriminated union over `event` so a
 * single `safeParse` call yields a typed `payload`.
 */

import { z } from "zod";
import {
  GoodsReceiptPostedEventSchema,
  GoodsReceiptPostedEvent,
} from "./goods-receipt-posted.js";
import {
  BatchProductionCompletedEventSchema,
  BatchProductionCompletedEvent,
} from "./batch-production-completed.js";
import {
  InventoryAdjustedEventSchema,
  InventoryAdjustedEvent,
} from "./inventory-adjusted.js";

/** Canonical event names shipped over the wire. */
export const WebhookEventName = {
  GoodsReceiptPosted: "goods_receipt.posted",
  BatchProductionCompleted: "batch_production.completed",
  InventoryAdjusted: "inventory.adjusted",
} as const;

export const WebhookEventNameSchema = z.enum([
  WebhookEventName.GoodsReceiptPosted,
  WebhookEventName.BatchProductionCompleted,
  WebhookEventName.InventoryAdjusted,
]);
export type WebhookEventName = z.infer<typeof WebhookEventNameSchema>;

/**
 * The discriminated envelope. `payload` is typed per `event`.
 * Use this when you want full typing on the payload after parsing.
 */
export const WebhookEnvelopeSchema = z.discriminatedUnion("event", [
  GoodsReceiptPostedEventSchema,
  BatchProductionCompletedEventSchema,
  InventoryAdjustedEventSchema,
]);
export type WebhookEnvelope =
  | GoodsReceiptPostedEvent
  | BatchProductionCompletedEvent
  | InventoryAdjustedEvent;

/**
 * The "untyped" envelope shape — useful when you want to parse the
 * outer wrapper before deciding which handler to route to (e.g. for
 * logging unknown events without rejecting them at the edge).
 */
export const RawWebhookEnvelopeSchema = z.object({
  event: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  idempotencyKey: z.string().min(1),
  payload: z.unknown(),
});
export type RawWebhookEnvelope = z.infer<typeof RawWebhookEnvelopeSchema>;
