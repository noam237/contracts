import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";

import {
  GoodsReceiptPostedEventSchema,
  BatchProductionCompletedEventSchema,
  InventoryAdjustedEventSchema,
  WebhookEnvelopeSchema,
  RawWebhookEnvelopeSchema,
  WebhookEventName,
} from "../src/webhooks/index.js";

import {
  CurrencySchema,
  ItemTypeSchema,
  BOMComponentTypeSchema,
  TransactionTypeSchema,
  WOStatusSchema,
  CategoryTypeSchema,
  PurchasingMethodSchema,
  GoodsReceiptStatusSchema,
} from "../src/enums.js";

import {
  SkuSchema,
  isValidSku,
  DocumentNumberSchema,
  isValidDocumentNumber,
  parseDocumentNumber,
} from "../src/formats.js";

// ──────────────────────────────────────────────────────────────────────
// Webhook event round-trip
// ──────────────────────────────────────────────────────────────────────

const ts = () => new Date().toISOString();
const idem = () => randomUUID();

describe("webhook events — round-trip", () => {
  it("goods_receipt.posted parses a representative payload", () => {
    const event = {
      event: WebhookEventName.GoodsReceiptPosted,
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {
        goodsReceiptId: "ckxyz0001abcdef",
        number: "GR-2026-0001",
        purchaseOrderId: "ckxyz0002po",
        itemIds: ["ckxyz0003item", "ckxyz0004item"],
      },
    };
    const parsed = GoodsReceiptPostedEventSchema.safeParse(event);
    expect(parsed.success).toBe(true);
  });

  it("goods_receipt.posted rejects empty itemIds", () => {
    const event = {
      event: WebhookEventName.GoodsReceiptPosted,
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {
        goodsReceiptId: "id",
        number: "GR-2026-0001",
        purchaseOrderId: "po",
        itemIds: [],
      },
    };
    expect(GoodsReceiptPostedEventSchema.safeParse(event).success).toBe(false);
  });

  it("batch_production.completed parses a representative payload", () => {
    const event = {
      event: WebhookEventName.BatchProductionCompleted,
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {
        batchProductionId: "ckbp0001",
        batchNumber: "B-2026-0042",
        itemId: "ckitem0001",
        batchSizeKg: 250.5,
      },
    };
    expect(BatchProductionCompletedEventSchema.safeParse(event).success).toBe(true);
  });

  it("batch_production.completed rejects negative batchSizeKg", () => {
    const event = {
      event: WebhookEventName.BatchProductionCompleted,
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {
        batchProductionId: "id",
        batchNumber: "B-2026-0042",
        itemId: "i",
        batchSizeKg: -5,
      },
    };
    expect(BatchProductionCompletedEventSchema.safeParse(event).success).toBe(false);
  });

  it("inventory.adjusted accepts the minimal payload (just itemId)", () => {
    const event = {
      event: WebhookEventName.InventoryAdjusted,
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {
        itemId: "ckitem0001",
      },
    };
    expect(InventoryAdjustedEventSchema.safeParse(event).success).toBe(true);
  });

  it("inventory.adjusted accepts the full payload", () => {
    const event = {
      event: WebhookEventName.InventoryAdjusted,
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {
        itemId: "ckitem0001",
        sku: "101-1A-001",
        adjustedQty: 12.5,
        availableQty: 100.0,
        transactionId: "cktx0001",
      },
    };
    expect(InventoryAdjustedEventSchema.safeParse(event).success).toBe(true);
  });

  it("WebhookEnvelopeSchema discriminates by event name", () => {
    const grEvent = {
      event: WebhookEventName.GoodsReceiptPosted,
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {
        goodsReceiptId: "id",
        number: "GR-2026-0001",
        purchaseOrderId: "po",
        itemIds: ["i1"],
      },
    };
    const parsed = WebhookEnvelopeSchema.safeParse(grEvent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // After narrowing, payload is typed correctly per event.
      expect(parsed.data.event).toBe(WebhookEventName.GoodsReceiptPosted);
    }
  });

  it("WebhookEnvelopeSchema rejects unknown event names", () => {
    const evt = {
      event: "totally.unknown.event",
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: {},
    };
    expect(WebhookEnvelopeSchema.safeParse(evt).success).toBe(false);
  });

  it("RawWebhookEnvelopeSchema accepts arbitrary event names (for logging)", () => {
    const evt = {
      event: "future.event.not.in.union",
      timestamp: ts(),
      idempotencyKey: idem(),
      payload: { whatever: 1 },
    };
    expect(RawWebhookEnvelopeSchema.safeParse(evt).success).toBe(true);
  });

  it("envelope rejects a non-ISO timestamp", () => {
    const evt = {
      event: WebhookEventName.InventoryAdjusted,
      timestamp: "not a date",
      idempotencyKey: idem(),
      payload: { itemId: "i" },
    };
    expect(InventoryAdjustedEventSchema.safeParse(evt).success).toBe(false);
  });

  it("envelope rejects an empty idempotencyKey", () => {
    const evt = {
      event: WebhookEventName.InventoryAdjusted,
      timestamp: ts(),
      idempotencyKey: "",
      payload: { itemId: "i" },
    };
    expect(InventoryAdjustedEventSchema.safeParse(evt).success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Enum round-trip
// ──────────────────────────────────────────────────────────────────────

describe("enums — known values pass, unknown fail", () => {
  const cases: Array<{
    name: string;
    schema: { safeParse: (v: unknown) => { success: boolean } };
    valid: string[];
    invalid: string[];
  }> = [
    {
      name: "Currency",
      schema: CurrencySchema,
      valid: ["ILS", "USD", "EUR", "GBP"],
      invalid: ["JPY", "ils", ""],
    },
    {
      name: "ItemType",
      schema: ItemTypeSchema,
      valid: [
        "RAW_MATERIAL",
        "PACKAGING",
        "OPERATIONAL",
        "FINISHED_GOOD",
        "SEMI_FINISHED",
      ],
      invalid: ["INGREDIENT", "raw_material", "FG"],
    },
    {
      name: "BOMComponentType",
      schema: BOMComponentTypeSchema,
      valid: ["RAW_MATERIAL", "PACKAGING", "OPERATIONAL", "SEMI_FINISHED"],
      invalid: ["FINISHED_GOOD", "OTHER"],
    },
    {
      name: "TransactionType",
      schema: TransactionTypeSchema,
      valid: ["RECEIPT", "ISSUE", "ADJUSTMENT", "RETURN", "PRODUCTION"],
      invalid: ["TRANSFER", "issue"],
    },
    {
      name: "WOStatus",
      schema: WOStatusSchema,
      valid: ["DRAFT", "PLANNED", "IN_PRODUCTION", "COMPLETED", "CANCELLED"],
      invalid: ["CANCELED", "in_production"],
    },
    {
      name: "CategoryType",
      schema: CategoryTypeSchema,
      valid: ["INGREDIENT", "PRODUCT"],
      invalid: ["RAW_MATERIAL", "ingredient"],
    },
    {
      name: "PurchasingMethod",
      schema: PurchasingMethodSchema,
      valid: ["NORMAL", "LONG_LEAD_TIME", "BLANKET_AGREEMENT"],
      invalid: ["EXPRESS", "normal"],
    },
    {
      name: "GoodsReceiptStatus",
      schema: GoodsReceiptStatusSchema,
      valid: ["DRAFT", "POSTED", "CANCELED"],
      invalid: ["CANCELLED", "draft"],
    },
  ];

  for (const c of cases) {
    it(`${c.name}: known values parse`, () => {
      for (const v of c.valid) {
        expect(c.schema.safeParse(v).success).toBe(true);
      }
    });
    it(`${c.name}: unknown values reject`, () => {
      for (const v of c.invalid) {
        expect(c.schema.safeParse(v).success).toBe(false);
      }
    });
  }
});

// ──────────────────────────────────────────────────────────────────────
// Format round-trip
// ──────────────────────────────────────────────────────────────────────

describe("SKU format", () => {
  it.each([
    "101-1A-001",
    "101-1FL-042",
    "101-1BF-1234",
    "101-1P-999999",
  ])("accepts %s", (sku) => {
    expect(isValidSku(sku)).toBe(true);
    expect(SkuSchema.safeParse(sku).success).toBe(true);
  });

  it.each([
    "101-A-001",       // missing the leading "1"
    "101-1abc-001",    // lowercase category
    "101-1ABC-001",    // 3-letter category
    "100-1A-001",      // wrong constant prefix
    "101-1A-",         // empty sequence
    "101-1A-abc",      // non-numeric sequence
    "",
  ])("rejects %s", (sku) => {
    expect(isValidSku(sku)).toBe(false);
    expect(SkuSchema.safeParse(sku).success).toBe(false);
  });
});

describe("document number format", () => {
  it.each([
    "PO-2026-0001",
    "GR-2026-0042",
    "PLAN-2026-000123",
    "RTV-2025-9999",
  ])("accepts %s", (n) => {
    expect(isValidDocumentNumber(n)).toBe(true);
    expect(DocumentNumberSchema.safeParse(n).success).toBe(true);
  });

  it.each([
    "po-2026-0001",    // lowercase prefix
    "PO-26-0001",      // 2-digit year
    "PO-2026-",        // empty seq
    "PO 2026 0001",    // spaces, no hyphens
    "",
  ])("rejects %s", (n) => {
    expect(isValidDocumentNumber(n)).toBe(false);
    expect(DocumentNumberSchema.safeParse(n).success).toBe(false);
  });

  it("parses parts correctly", () => {
    const parsed = parseDocumentNumber("PO-2026-0042");
    expect(parsed).toEqual({ prefix: "PO", year: 2026, sequence: 42 });
  });

  it("returns null for unparseable strings", () => {
    expect(parseDocumentNumber("not-a-doc-number")).toBeNull();
  });
});
