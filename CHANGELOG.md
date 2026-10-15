# Changelog

All notable changes to `@noam237/contracts` are recorded here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org)
(strict from `1.0.0`; minor versions in `0.x` may include breaking changes).

## 0.5.0 — Focus: ERP company metrics

### Added
- `@noam237/contracts/rest` `focus` — `FocusErpMetricKeySchema`: the ERP's
  answer to `GET /api/focus/v1/company-metrics` (same query and response
  schemas as the CRM's, `source: "ERP"`), so a Focus goal's result can fill
  itself from production numbers:
  `erp.batches_released`, `erp.units_released`, `erp.deviations_opened`,
  `erp.deviations_closed`. Whole-company daily totals only; no person, no money.
  The ERP checks a key of its own, `FOCUS_API_KEY`, never `SERVICE_API_KEY`,
  and wraps its answer as `{ data }`.

## 0.4.0 — Focus read-only metrics

Version 0.3.0 is the stock-contract correction in PR #68; the two touch
different files and can merge in either order.

### Added
- `@noam237/contracts/rest` `focus` — what Focus (the goals and weekly-promise
  app) pulls from the CRM. Focus only pulls; nothing calls Focus.
  - `FocusDaySchema` (an Israel calendar day, `YYYY-MM-DD`), `focusRangeDays`
    and the range caps (62 days for metrics, 7 days and 25 people for activity).
  - `GET /api/focus/v1/company-metrics`: `FocusCompanyMetricsQuerySchema`,
    `FocusCrmMetricKeySchema` (`crm.orders_paid`, `crm.accounts_new`,
    `crm.cases_opened`, `crm.cases_closed`) and
    `FocusCompanyMetricsResponseSchema` — one value per key per day, zeros
    included.
  - `POST /api/focus/v1/user-activity`: `FocusUserActivityRequestSchema` (the
    people who opted in, by email, in the body so no email lands in a URL),
    `FocusActivityKeySchema` and `FocusUserActivityResponseSchema` — counts of
    completed work per person per day.

Only counts of completed work cross this boundary: no scores, sentiment,
ratings, durations or per-person money. Company money figures are left out
until the owner decides how Focus may show them. ERP metrics follow in a later
minor version.

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
