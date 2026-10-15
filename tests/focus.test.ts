import { describe, it, expect } from "vitest";

import {
  FocusDaySchema,
  FocusCompanyMetricsQuerySchema,
  FocusCompanyMetricsResponseSchema,
  FocusCrmMetricKeySchema,
  FocusErpMetricKeySchema,
  FocusUserActivityRequestSchema,
  FocusUserActivityResponseSchema,
  FocusActivityKeySchema,
  focusRangeDays,
  FOCUS_MAX_METRIC_RANGE_DAYS,
  FOCUS_MAX_ACTIVITY_PEOPLE,
} from "../src/rest/index.js";

describe("Focus contracts — days and ranges", () => {
  it("accepts real calendar days and refuses the rest", () => {
    expect(FocusDaySchema.safeParse("2026-10-07").success).toBe(true);
    expect(FocusDaySchema.safeParse("2028-02-29").success).toBe(true);
    expect(FocusDaySchema.safeParse("2026-02-30").success).toBe(false);
    expect(FocusDaySchema.safeParse("2026-10-7").success).toBe(false);
    expect(FocusDaySchema.safeParse("2026-10-07T00:00:00Z").success).toBe(false);
  });

  it("counts both ends of a range", () => {
    expect(focusRangeDays("2026-10-01", "2026-10-01")).toBe(1);
    expect(focusRangeDays("2026-10-01", "2026-10-07")).toBe(7);
    // Across the end of daylight saving time in Israel (2026-10-25).
    expect(focusRangeDays("2026-10-24", "2026-10-26")).toBe(3);
  });

  it("caps a company-metrics range and refuses a reversed one", () => {
    expect(
      FocusCompanyMetricsQuerySchema.safeParse({ from: "2026-10-01", to: "2026-10-31" }).success,
    ).toBe(true);
    const start = new Date("2026-01-01T00:00:00Z");
    const tooFar = new Date(start.getTime() + FOCUS_MAX_METRIC_RANGE_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(
      FocusCompanyMetricsQuerySchema.safeParse({ from: "2026-01-01", to: tooFar }).success,
    ).toBe(false);
    expect(
      FocusCompanyMetricsQuerySchema.safeParse({ from: "2026-10-02", to: "2026-10-01" }).success,
    ).toBe(false);
  });
});

describe("Focus contracts — company metrics", () => {
  it("round-trips a representative CRM answer", () => {
    const payload = {
      source: "CRM",
      from: "2026-10-06",
      to: "2026-10-07",
      generatedAt: "2026-10-07T12:30:00.000+03:00",
      values: FocusCrmMetricKeySchema.options.flatMap((key) => [
        { day: "2026-10-06", key, value: 0 },
        { day: "2026-10-07", key, value: 4 },
      ]),
    };
    const parsed = FocusCompanyMetricsResponseSchema.parse(payload);
    expect(parsed.values).toHaveLength(8);
  });

  it("round-trips a representative ERP answer", () => {
    const payload = {
      source: "ERP",
      from: "2026-10-07",
      to: "2026-10-07",
      generatedAt: "2026-10-07T12:30:00.000Z",
      values: FocusErpMetricKeySchema.options.map((key) => ({
        day: "2026-10-07",
        key,
        value: key === "erp.units_released" ? 4800 : 2,
      })),
    };
    const parsed = FocusCompanyMetricsResponseSchema.parse(payload);
    expect(parsed.source).toBe("ERP");
    expect(parsed.values).toHaveLength(4);
  });

  it("keeps each system's keys under its own prefix", () => {
    for (const key of FocusCrmMetricKeySchema.options) expect(key.startsWith("crm.")).toBe(true);
    for (const key of FocusErpMetricKeySchema.options) expect(key.startsWith("erp.")).toBe(true);
  });

  it("lets an older consumer read a key it does not know yet", () => {
    const parsed = FocusCompanyMetricsResponseSchema.parse({
      source: "CRM",
      from: "2026-10-07",
      to: "2026-10-07",
      generatedAt: "2026-10-07T09:00:00Z",
      values: [{ day: "2026-10-07", key: "crm.something_new", value: 1 }],
    });
    expect(parsed.values[0].key).toBe("crm.something_new");
  });

  it("refuses negative or non-finite values", () => {
    for (const value of [-1, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(
        FocusCompanyMetricsResponseSchema.safeParse({
          source: "CRM",
          from: "2026-10-07",
          to: "2026-10-07",
          generatedAt: "2026-10-07T09:00:00Z",
          values: [{ day: "2026-10-07", key: "crm.orders_paid", value }],
        }).success,
      ).toBe(false);
    }
  });
});

describe("Focus contracts — user activity", () => {
  it("lower-cases emails and accepts up to a week", () => {
    const parsed = FocusUserActivityRequestSchema.parse({
      from: "2026-10-01",
      to: "2026-10-07",
      emails: ["Dana@SabonMichal.co.il"],
    });
    expect(parsed.emails).toEqual(["dana@sabonmichal.co.il"]);
  });

  it("refuses more than a week, too many people, no people or unknown fields", () => {
    const base = { from: "2026-10-01", to: "2026-10-07", emails: ["a@b.co"] };
    expect(FocusUserActivityRequestSchema.safeParse({ ...base, to: "2026-10-08" }).success).toBe(
      false,
    );
    expect(FocusUserActivityRequestSchema.safeParse({ ...base, emails: [] }).success).toBe(false);
    const many = Array.from({ length: FOCUS_MAX_ACTIVITY_PEOPLE + 1 }, (_, i) => `p${i}@b.co`);
    expect(FocusUserActivityRequestSchema.safeParse({ ...base, emails: many }).success).toBe(false);
    expect(FocusUserActivityRequestSchema.safeParse({ ...base, score: 1 }).success).toBe(false);
  });

  it("round-trips an answer with a person the CRM does not know", () => {
    const counts = Object.fromEntries(FocusActivityKeySchema.options.map((key) => [key, 2]));
    const parsed = FocusUserActivityResponseSchema.parse({
      from: "2026-10-07",
      to: "2026-10-07",
      generatedAt: "2026-10-07T09:00:00Z",
      people: [
        { email: "dana@sabonmichal.co.il", found: true, days: [{ day: "2026-10-07", counts }] },
        { email: "new@sabonmichal.co.il", found: false, days: [] },
      ],
    });
    expect(parsed.people[0].days[0].counts.cases_closed).toBe(2);
  });

  it("carries counts only: no fractions and no negatives", () => {
    for (const bad of [1.5, -1]) {
      expect(
        FocusUserActivityResponseSchema.safeParse({
          from: "2026-10-07",
          to: "2026-10-07",
          generatedAt: "2026-10-07T09:00:00Z",
          people: [
            {
              email: "dana@sabonmichal.co.il",
              found: true,
              days: [{ day: "2026-10-07", counts: { cases_closed: bad } }],
            },
          ],
        }).success,
      ).toBe(false);
    }
  });
});
