# ADR 0001 — Package design for `@sabonmichal/contracts`

**Status:** Accepted
**Date:** 2026-05

## Context

Per ERP [ADR 0004](https://github.com/sabonmichal/erp/blob/main/docs/adr/0004-polyrepo-with-shared-contracts.md),
the Sabon Michal ecosystem (ERP, CRM, future store) is a **polyrepo +
shared contracts package** rather than a monorepo. This package is
that shared contracts artefact. ADR 0004 already covers the
ecosystem-level decision. This ADR records the LOCAL decisions about
how the package itself is shaped.

## Decisions

### 1. ESM-only, NodeNext modules

The package ships pure ESM (`"type": "module"`, NodeNext resolution,
sub-path imports use the `.js` extension at the source level). All
three consumers (ERP, CRM, store) are Next.js 16 / Node 20+ apps;
none need CJS. Dropping CJS keeps the build to a single artefact and
removes dual-package-hazard risk.

### 2. Zod ^4 as a peer dependency

Zod is a peer dependency (`^4.0.0`), not a regular dependency. This:
- Avoids two copies of Zod ending up in a consumer's bundle (one from
  the consumer, one from this package), which would defeat
  `instanceof` checks and inflate bundle size.
- Forces consumers to opt into a major Zod upgrade in lockstep with
  the contract package, so a breaking Zod change is announced via
  this package's release notes rather than discovered at install.

### 3. GitHub Packages registry, private

The package is published to `https://npm.pkg.github.com` under the
`@sabonmichal` scope. It is private (the `publishConfig.access` is
`restricted`). Rationale:
- The contract surface includes business-domain language (Hebrew enum
  comments, Sabon Michal-specific event names) we don't want public.
- Auth via `${{ secrets.GITHUB_TOKEN }}` in CI keeps the secret-management
  story trivial — no Cloudsmith / Verdaccio to operate.
- If we ever need to expose a subset publicly (e.g. for partner
  integrations), we'll publish a thin `@sabonmichal/contracts-public`
  package separately.

### 4. Versioning: 0.x while iterating, strict semver from 1.0

While the contract is still being shaped (today: 3 webhook events, 4
stub REST endpoints, ~8 enums), minor bumps within 0.x are allowed
to include breaking changes. We commit to:
- Always document every breaking change in `CHANGELOG.md`.
- Promote to 1.0 once the surface has been stable for two consecutive
  consumer migrations without contract churn.

### 5. Tag-driven publish, not branch-driven

`publish.yml` runs only on `v*` tag pushes — not on every merge to
`main`. This keeps publishes intentional. The workflow asserts the
tag string matches `package.json` version so a forgotten bump fails
loudly instead of publishing a stale artefact.

### 6. No code generation

The schemas are hand-written Zod. We considered generating from
Prisma or OpenAPI; both rejected:
- Prisma generation would couple this package to the ERP's exact
  Prisma version, defeating the polyrepo isolation.
- OpenAPI codegen is overkill for a TS-only ecosystem of this size
  (see ERP ADR 0004's "Alternatives considered").

If we ever add a non-TS consumer (Python, Go), we'll revisit
OpenAPI as a generated additional artefact rather than the source
of truth.

### 7. The webhook envelope is a discriminated union

`WebhookEnvelopeSchema` is `z.discriminatedUnion("event", [...])`
over the per-event schemas. A single `safeParse` yields a typed
`payload` after narrowing. We also export `RawWebhookEnvelopeSchema`
(payload as `z.unknown()`) for forward-compatibility — receivers can
log unknown future events without rejecting them at the edge.

## Consequences

- A breaking change to a webhook payload here causes a TypeScript
  error in any consumer that hasn't updated — the safety net ADR 0004
  promised.
- Adding a new webhook event is two file changes here (the per-event
  schema + adding it to the envelope union) plus a minor version bump.
- The first time the surface needs to grow significantly (e.g. a new
  app — supplier portal, B2B portal), we revisit whether the current
  per-feature directory structure still scales.
