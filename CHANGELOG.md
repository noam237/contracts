# Changelog

All notable changes to `@sabonmichal/contracts` are recorded here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org)
(strict from `1.0.0`; minor versions in `0.x` may include breaking changes).

## 0.1.0 — Initial scaffold

Initial release. Establishes the contract surface for the Sabon Michal
ecosystem (ERP, CRM, future store).

### Added
- `@sabonmichal/contracts/webhooks`
  - `goods_receipt.posted` event schema
  - `batch_production.completed` event schema
  - `inventory.adjusted` event schema
  - `WebhookEnvelopeSchema` discriminated union
  - `RawWebhookEnvelopeSchema` for forward-compatible logging
- `@sabonmichal/contracts/rest`
  - `getStock`, `reserveStock`, `releaseStock`, `deductStock` request/response schemas (TODO — endpoints not yet implemented on ERP)
- `@sabonmichal/contracts/enums`
  - `Currency`, `ItemType`, `BOMComponentType`, `TransactionType`, `WOStatus`, `CategoryType`, `PurchasingMethod`, `GoodsReceiptStatus`
- `@sabonmichal/contracts/formats`
  - SKU regex `/^101-1[A-Z]{1,2}-\d+$/` + Zod schema + parser
  - Document-number regex `/^[A-Z]+-\d{4}-\d+$/` + Zod schema + parser
- `@sabonmichal/contracts/errors`
  - `ErrorResponseSchema` (`{ error: string }`)
  - `ErrorCode` constant catalog + `STATUS_TO_ERROR_CODE` reverse map
- `@sabonmichal/contracts/auth`
  - `makeServiceAuthHeader` / `verifyServiceAuthHeader` with timing-safe comparison
- `@sabonmichal/contracts/webhook-signing`
  - `signWebhookPayload` / `verifyWebhookSignature` (HMAC-SHA256, timing-safe)
  - `IdempotencyKeyCache` interface + `InMemoryIdempotencyKeyCache` reference impl
- CI: typecheck/lint/test/build on push and PR
- Publish: tag-driven (`v*`) GitHub Packages publish
