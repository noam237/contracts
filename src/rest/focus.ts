/**
 * Focus REST contracts — the read-only numbers Focus pulls from the CRM and
 * the ERP.
 *
 * Focus is the fourth system (quarterly goals and weekly promises). It PULLS
 * on a schedule; nothing in the CRM or ERP ever calls Focus, and Focus never
 * writes to them.
 *
 * Endpoints (CRM side, `Authorization: Bearer <API key with scope focus:read>`):
 *   GET  /api/focus/v1/company-metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   POST /api/focus/v1/user-activity        body: FocusUserActivityRequest
 *
 * `user-activity` is a POST only so that staff email addresses travel in the
 * body and not in a URL, where request logs would keep them. It reads; it
 * changes nothing.
 *
 * Endpoint (ERP side, `Authorization: Bearer <FOCUS_API_KEY>` — a key of
 * its own, never SERVICE_API_KEY):
 *   GET  /api/focus/v1/company-metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Each system wraps its answer in its usual envelope — the CRM as
 * `{ ok: true, data }`, the ERP as `{ data }`; the response schemas below
 * describe `data`.
 *
 * Days are Israel calendar days (Asia/Jerusalem), inclusive at both ends.
 * Every value is for ONE day — never a running total — so re-pulling a day
 * simply replaces it.
 *
 * What may cross this boundary: counts of completed work. Never scores,
 * sentiment, ratings, durations, or money per person. Company money figures
 * are left out for now: the CRM shows them only to people with financial
 * permission, and Focus shows goals to everyone.
 */

import { z } from "zod";

// ── Days and ranges ──────────────────────────────────────────────────

const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** True when "YYYY-MM-DD" names a real calendar date. */
function isCalendarDay(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** An Israel calendar day, "YYYY-MM-DD". */
export const FocusDaySchema = z
  .string()
  .regex(DAY_REGEX, "Day must be YYYY-MM-DD")
  .refine(isCalendarDay, "Day must be a real calendar date");
export type FocusDay = z.infer<typeof FocusDaySchema>;

/** Days from `from` to `to`, counting both ends ("2026-10-01".."2026-10-01" is 1). */
export function focusRangeDays(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** Longest range a company-metrics request may ask for. */
export const FOCUS_MAX_METRIC_RANGE_DAYS = 62;
/** Longest range a user-activity request may ask for. */
export const FOCUS_MAX_ACTIVITY_RANGE_DAYS = 7;
/** Most people a user-activity request may ask about. */
export const FOCUS_MAX_ACTIVITY_PEOPLE = 25;

function rangeSchema(maxDays: number) {
  return z
    .object({ from: FocusDaySchema, to: FocusDaySchema })
    .refine((range) => range.from <= range.to, {
      message: "`from` must not be after `to`",
      path: ["from"],
    })
    .refine((range) => focusRangeDays(range.from, range.to) <= maxDays, {
      message: `The range may span at most ${maxDays} days`,
      path: ["to"],
    });
}

// ── GET /api/focus/v1/company-metrics ────────────────────────────────

/** The query string of a company-metrics request. */
export const FocusCompanyMetricsQuerySchema = rangeSchema(FOCUS_MAX_METRIC_RANGE_DAYS);
export type FocusCompanyMetricsQuery = z.infer<typeof FocusCompanyMetricsQuerySchema>;

/**
 * Company metrics the CRM reports, each a whole-company count for one day.
 *
 * - `crm.orders_paid`    orders placed that day that are now paid or further
 *                        along (the CRM sales reports' definition), not deleted
 * - `crm.accounts_new`   active accounts created that day
 * - `crm.cases_opened`   support cases opened that day
 * - `crm.cases_closed`   support cases that reached RESOLVED or CLOSED that day
 */
export const FocusCrmMetricKeySchema = z.enum([
  "crm.orders_paid",
  "crm.accounts_new",
  "crm.cases_opened",
  "crm.cases_closed",
]);
export type FocusCrmMetricKey = z.infer<typeof FocusCrmMetricKeySchema>;

/**
 * Company metrics the ERP reports, each a whole-company total for one day.
 *
 * - `erp.batches_released`  production batches whose first QA release was
 *                           that day (each batch counted once)
 * - `erp.units_released`    finished-goods units QA put into sellable stock
 *                           that day: units on release forms released that day,
 *                           plus units from a release form's QA hold returned
 *                           to stock that day. Every size counts as one unit
 * - `erp.deviations_opened` deviations logged that day, not cancelled
 * - `erp.deviations_closed` deviations closed (not cancelled) that day
 */
export const FocusErpMetricKeySchema = z.enum([
  "erp.batches_released",
  "erp.units_released",
  "erp.deviations_opened",
  "erp.deviations_closed",
]);
export type FocusErpMetricKey = z.infer<typeof FocusErpMetricKeySchema>;

/**
 * One metric on one day. `key` is a plain string on the wire so a producer
 * that learns a new key does not break an older consumer: consumers keep the
 * keys they know and ignore the rest.
 */
export const FocusMetricValueSchema = z.object({
  day: FocusDaySchema,
  key: z.string().min(1),
  value: z.number().finite().nonnegative(),
});
export type FocusMetricValue = z.infer<typeof FocusMetricValueSchema>;

/**
 * The answer: one value per known key per day in the range, zeros included,
 * so a missing day always means "not computed", never "zero".
 */
export const FocusCompanyMetricsResponseSchema = z.object({
  source: z.enum(["CRM", "ERP"]),
  from: FocusDaySchema,
  to: FocusDaySchema,
  /** When the producer computed these values (ISO 8601 with offset). */
  generatedAt: z.string().datetime({ offset: true }),
  values: z.array(FocusMetricValueSchema),
});
export type FocusCompanyMetricsResponse = z.infer<typeof FocusCompanyMetricsResponseSchema>;

// ── POST /api/focus/v1/user-activity ─────────────────────────────────

/**
 * Completed work a person did in the CRM, counted per day. Shown only to that
 * person, in Focus's private layer, as credit for routine work.
 *
 * - `orders_created`   orders they created that day (not cancelled)
 * - `cases_closed`     cases assigned to them that reached RESOLVED or CLOSED
 * - `tasks_completed`  CRM tasks assigned to them that were completed
 * - `messages_sent`    outbound case messages they sent
 * - `calls_answered`   answered calls on their phone extension
 * - `leads_won`        accounts they moved to the WON lead stage
 */
export const FocusActivityKeySchema = z.enum([
  "orders_created",
  "cases_closed",
  "tasks_completed",
  "messages_sent",
  "calls_answered",
  "leads_won",
]);
export type FocusActivityKey = z.infer<typeof FocusActivityKeySchema>;

/**
 * Who to count, and when. Focus sends only the people who switched the link
 * on themselves; the CRM answers for those people and nobody else.
 */
export const FocusUserActivityRequestSchema = z
  .object({
    from: FocusDaySchema,
    to: FocusDaySchema,
    emails: z
      .array(z.email().transform((email) => email.toLowerCase()))
      .min(1)
      .max(FOCUS_MAX_ACTIVITY_PEOPLE),
  })
  .strict()
  .refine((request) => request.from <= request.to, {
    message: "`from` must not be after `to`",
    path: ["from"],
  })
  .refine(
    (request) =>
      focusRangeDays(request.from, request.to) <= FOCUS_MAX_ACTIVITY_RANGE_DAYS,
    {
      message: `The range may span at most ${FOCUS_MAX_ACTIVITY_RANGE_DAYS} days`,
      path: ["to"],
    },
  );
export type FocusUserActivityRequest = z.infer<typeof FocusUserActivityRequestSchema>;

/** One person's counts on one day. Keys as in `FocusActivityKeySchema`. */
export const FocusActivityDaySchema = z.object({
  day: FocusDaySchema,
  counts: z.record(z.string(), z.number().int().nonnegative()),
});
export type FocusActivityDay = z.infer<typeof FocusActivityDaySchema>;

export const FocusUserActivityResponseSchema = z.object({
  from: FocusDaySchema,
  to: FocusDaySchema,
  generatedAt: z.string().datetime({ offset: true }),
  people: z.array(
    z.object({
      email: z.email(),
      /** False when no active CRM user has this email; `days` is then empty. */
      found: z.boolean(),
      /** Every day of the range when found, zeros included. */
      days: z.array(FocusActivityDaySchema),
    }),
  ),
});
export type FocusUserActivityResponse = z.infer<typeof FocusUserActivityResponseSchema>;
