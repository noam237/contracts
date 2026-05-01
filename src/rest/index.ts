/**
 * Inter-service REST endpoint contracts.
 *
 * Each module exports request/response Zod schemas + derived TS types.
 * Endpoints are grouped by resource (stock, items, etc.).
 */

export * from "./stock.js";
