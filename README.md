# @sabonmichal/contracts

Cross-service contract source-of-truth for the **Sabon Michal** ecosystem
(ERP, CRM, future store).

## Why this package exists

The Sabon Michal triad is three independent services that talk to each
other over REST + webhooks:

| Service | Owns                                                             |
|---------|------------------------------------------------------------------|
| ERP     | Master Catalog, Inventory, Procurement, BOM, Batch Production    |
| CRM     | Customer Accounts, Order History, Support Cases, B2B Pricing     |
| Store   | (future) — public-facing storefront, no DB of its own            |

Until now, the wire formats — webhook event names, payload shapes,
shared enums like `Currency`, `ItemType`, `BOMComponentType` — were
duplicated by hand in each repo. A rename in one place silently broke
the others in production.

This package extracts those wire formats into one source of truth
written in **Zod**. A breaking change here causes a TypeScript /
runtime failure in any consumer that hasn't bumped — drift is caught
at compile time, not in production.

See [ADR 0001](docs/adr/0001-package-design.md) and the upstream ERP
[ADR 0004](https://github.com/sabonmichal/erp/blob/main/docs/adr/0004-polyrepo-with-shared-contracts.md)
for the design rationale.

## What's inside

| Module                                       | Contents                                                                |
|----------------------------------------------|-------------------------------------------------------------------------|
| `@sabonmichal/contracts/webhooks`            | Zod schemas + types for every inter-service webhook event                |
| `@sabonmichal/contracts/rest`                | Zod request/response schemas for inter-service REST endpoints            |
| `@sabonmichal/contracts/enums`               | `Currency`, `ItemType`, `BOMComponentType`, `TransactionType`, `WOStatus`, `CategoryType`, `PurchasingMethod`, `GoodsReceiptStatus` |
| `@sabonmichal/contracts/formats`             | SKU regex, document-number regex, validators                             |
| `@sabonmichal/contracts/errors`              | `ErrorResponseSchema` + common `ErrorCode` constants                     |
| `@sabonmichal/contracts/auth`                | `makeServiceAuthHeader` / `verifyServiceAuthHeader` (timing-safe)        |
| `@sabonmichal/contracts/webhook-signing`     | HMAC-SHA256 sign/verify + `IdempotencyKeyCache` interface                |

You can also import everything from the root: `import { ... } from "@sabonmichal/contracts"`.

What this package is **not**: business logic, Prisma models, UI
components, auth sessions. Only the wire-format truths that two or
more apps must agree on.

## Installing in a consumer (ERP, CRM, store)

This package is published to **GitHub Packages** as a private package.

1. Add an `.npmrc` at the consumer repo root:

   ```ini
   @sabonmichal:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

2. Set `NODE_AUTH_TOKEN` in your shell (a GitHub PAT with the
   `read:packages` scope, or — in CI — `${{ secrets.GITHUB_TOKEN }}`).

3. Install:

   ```bash
   npm install @sabonmichal/contracts
   ```

4. Use:

   ```ts
   import {
     CurrencySchema,
     SkuSchema,
     makeServiceAuthHeader,
   } from "@sabonmichal/contracts";

   import {
     WebhookEnvelopeSchema,
     GoodsReceiptPostedEventSchema,
   } from "@sabonmichal/contracts/webhooks";
   ```

## Versioning policy

- **0.x** while we're iterating on the contract shape. Minor bumps
  may include breaking changes; consumers must read the CHANGELOG
  before bumping.
- **1.0** when the surface stabilises. From there, semver applies
  strictly: breaking change → major bump.
- A field rename, a removed enum value, or a new required field is
  a breaking change. Adding optional fields is a minor bump.

## Contributing

The publish flow is fully automated:

1. Make changes on a feature branch, open a PR. CI runs typecheck,
   tests, and build.
2. After merging to `main`:
   - Bump the version in `package.json` (semver per the policy above).
   - Update `CHANGELOG.md` with the changes.
   - Commit with `chore: release vX.Y.Z`.
   - Tag: `git tag vX.Y.Z && git push --tags`.
3. The `publish` workflow runs on the tag push, re-runs the full
   quality gate, and publishes to GitHub Packages with
   `${{ secrets.GITHUB_TOKEN }}`.

> **One-time setup:** in this repo's GitHub Settings → Actions →
> General → Workflow permissions, ensure "Read and write permissions"
> is enabled so the publish workflow can write to GitHub Packages.

## Local development

```bash
npm install
npm test           # vitest, all suites
npm run typecheck  # tsc --noEmit
npm run build      # tsc → dist/
```
