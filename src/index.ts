/**
 * @sabonmichal/contracts — cross-service contract source-of-truth
 * for the Sabon Michal ecosystem (ERP, CRM, store).
 *
 * Re-exports every public surface for convenience. Sub-path imports
 * (e.g. `@sabonmichal/contracts/webhooks`) are also supported via
 * the `exports` map in package.json.
 */

export * as Webhooks from "./webhooks/index.js";
export * as Rest from "./rest/index.js";
