# Changelog

All notable changes to `@noam237/contracts` are recorded here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org)
(strict from `1.0.0`; minor versions in `0.x` may include breaking changes).

## 0.3.0 — Stock contract corrected to match implementation

### Changed
- `@noam237/contracts/rest` `stock` — rewritten to describe the stock endpoints
  **as actually implemented** by the ERP and CRM, replacing an aspirational,
  never-built design that had drifted from reality (it documented per-item URLs,
  `reference`/`reservationId`, TTLs, and response envelopes that do not exist).
  - `ReserveStockRequest` is now `{ itemId, quantity, orderId, idempotencyKey? }`
    — the new optional `idempotencyKey` makes a retried reserve a no-op instead
    of a double reduction; `ReserveStockResponse` is the flat
    `{ success, transactionId, availableAfter }`.
  - `DeductStockRequest` / `ReleaseStockRequest` are `{ transactionId, orderId }`
    → `{ success }`.
  - Removed the per-item `GetStock*` schemas; documented the real read path
    (`GET /api/inventory/finished-goods`) as a pointer instead.

The stock types were unused by both apps (each kept local copies), so this is a
documentation-accuracy fix with **no runtime impact** — but it stops a future
consumer (e.g. the store service) from building to the wrong shape.

## 0.2.0 — Historic purchase replay

### Added
- `@noam237/contracts/rest`
  - `HistoricPurchaseLine`, `HistoricPurchaseEvent` schemas — a post-kit-explosion
    product purchase line and one historic order.
  - `HistoricPurchaseIngestRequest` / `HistoricPurchaseIngestResponse` — the
    `POST /api/historic-purchases/ingest` contract (chronological batch append).
  - `HistoricPurchaseResetRequest` / `HistoricPurchaseResetResponse` — the
    `POST /api/historic-purchases/reset` contract (wipe a prior replay run).
  - `ReplayRunId` schema — stable identifier for one replay run.

These power the one-shot CRM → ERP backfill of every completed historic order
(back to 2016) into the ERP's dedicated `HistoricPurchase` table. The rows are a
demand dataset and never touch the inventory ledger.

## 0.1.0 — Initial scaffold

Initial release. Establishes the contract surface for the Sabon Michal
ecosystem (ERP, CRM, future store).

### Added
- `@noam237/contracts/webhooks`
  - `goods_receipt.posted` event schema
  - `batch_production.completed` event schema
  - `inventory.adjusted` event schema
  - `WebhookEnvelopeSchema` discriminated union
  - `RawWebhookEnvelopeSchema` for forward-compatible logging
- `@noam237/contracts/rest`
  - `getStock`, `reserveStock`, `releaseStock`, `deductStock` request/response schemas (TODO — endpoints not yet implemented on ERP)
- `@noam237/contracts/enums`
  - `Currency`, `ItemType`, `BOMComponentType`, `TransactionType`, `WOStatus`, `CategoryType`, `PurchasingMethod`, `GoodsReceiptStatus`
- `@noam237/contracts/formats`
  - SKU regex `/^101-1[A-Z]{1,2}-\d+$/` + Zod schema + parser
  - Document-number regex `/^[A-Z]+-\d{4}-\d+$/` + Zod schema + parser
- `@noam237/contracts/errors`
  - `ErrorResponseSchema` (`{ error: string }`)
  - `ErrorCode` constant catalog + `STATUS_TO_ERROR_CODE` reverse map
- `@noam237/contracts/auth`
  - `makeServiceAuthHeader` / `verifyServiceAuthHeader` with timing-safe comparison
- `@noam237/contracts/webhook-signing`
  - `signWebhookPayload` / `verifyWebhookSignature` (HMAC-SHA256, timing-safe)
  - `IdempotencyKeyCache` interface + `InMemoryIdempotencyKeyCache` reference impl
- CI: typecheck/lint/test/build on push and PR
- Publish: tag-driven (`v*`) GitHub Packages publish
