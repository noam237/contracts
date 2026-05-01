/**
 * Webhook event contracts.
 *
 * Each event has its own file and exports:
 *   - `*PayloadSchema` / `*Payload` — the inner payload shape
 *   - `*EventSchema` / `*Event`     — the full envelope (event/timestamp/idempotencyKey/payload)
 *
 * Use `WebhookEnvelopeSchema` (discriminated union) when you want a
 * single parse call to give you a typed payload.
 */

export * from "./envelope.js";
export * from "./goods-receipt-posted.js";
export * from "./batch-production-completed.js";
export * from "./inventory-adjusted.js";
