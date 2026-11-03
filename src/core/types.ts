/**
 * The app's own view of an order. The Wix layer converts Wix eCom orders into this shape,
 * so the core logic never depends on the Wix SDK and can be tested on its own.
 */
export type WeightUnit = "oz" | "lb" | "kg" | "g";

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  /** Weight of one unit, in the order's weightUnit. Undefined when the product has no weight set. */
  weight?: number;
}

export interface OrderForExport {
  /** The Wix order number customers see, e.g. "10342". Becomes the Stamps.com Order ID. */
  number: string;
  /** ISO date-time the order was placed. */
  createdAt: string;
  recipient: {
    fullName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    /** State, county or province as entered. */
    region?: string;
    postalCode: string;
    /** ISO 3166-1 alpha-2, e.g. "US", "GB". */
    countryCode: string;
    phone?: string;
    email?: string;
  };
  items: OrderItem[];
  weightUnit: WeightUnit;
  total: number;
  currency: string;
  shippingMethod?: string;
}

/** How one Stamps.com column gets its value. */
export type ColumnSource =
  | { kind: "field"; field: string; format?: string }
  | { kind: "fixed"; value: string }
  | { kind: "blank" };

/** One column of a store's Stamps.com order file, in the exact order and spelling of its sample.csv. */
export interface ColumnMapping {
  header: string;
  source: ColumnSource;
  /** "list" when the fixed match list filled it, "store" when the store chose it, "none" when still unset. */
  matchedBy: "list" | "store" | "none";
}

export interface OrderLayout {
  columns: ColumnMapping[];
}

/** Where the app finds what it needs in a store's Stamps.com print-history export. */
export interface HistoryLayout {
  orderId?: string;
  trackingNumber?: string;
  carrier?: string;
  service?: string;
}

/** What the app knows about an order on the Wix side when matching tracking numbers back. */
export interface OrderState {
  orderId: string;
  number: string;
  /** "not_ready": not yet paid or approved, so it must not be marked shipped. */
  status: "not_fulfilled" | "fulfilled" | "cancelled" | "not_ready";
}
