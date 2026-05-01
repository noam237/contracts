# Changelog

All notable changes to `@noam237/contracts` are recorded here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org)
(strict from `1.0.0`; minor versions in `0.x` may include breaking changes).

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
