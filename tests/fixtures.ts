import type { OrderForExport } from "../src/core/types.js";

/**
 * Made-up files shaped like Stamps.com's. They are NOT copies of the real sample.csv or
 * print-history export; replace them with real files once available.
 */
export const SAMPLE_CSV = [
  "Order ID (required),Order Date,Recipient Name,Company,Address 1,Address 2,City,State,Postal Code,Country,Email,Phone,Item SKU,Quantity,Weight (oz),Gift Message,Cost Code",
  "1001,2026-01-01,Jane Doe,,1 Main St,,Springfield,IL,62701,US,jane@example.com,555-0100,ABC-1,1,8,,",
  "1002,2026-01-02,John Roe,,2 High St,,Leeds,,LS1 1AA,GB,john@example.com,,ABC-2,2,16,,",
  "",
  "Notes: enter weights as decimals, e.g. .75 not 3/4",
].join("\n");

export const HISTORY_CSV = [
  "Date Printed,Order ID,Recipient,Carrier,Mail Class,Tracking #,Amount",
  "2026-11-15,10342,A. Thompson,UPS,UPS Ground,1Z999AA10123456784,12.40",
  "2026-11-15,#10343,R. Clarke,USPS GlobalPost,GlobalPost Standard,GP82736451,18.10",
  "2026-11-15,10339,M. Joseph,UPS,UPS Ground,1Z999AA10123456700,11.90",
  "2026-11-15,,Walk-in,USPS,Priority Mail,9400100000000000000000,9.10",
].join("\r\n");

export const ORDER: OrderForExport = {
  number: "10342",
  createdAt: "2026-11-14T10:22:00Z",
  recipient: {
    fullName: "A. Thompson",
    address1: "10 Example Ave, Apt 4",
    city: "Brooklyn",
    region: "NY",
    postalCode: "11201",
    countryCode: "US",
    email: "a.thompson@example.com",
    phone: "555-0101",
  },
  items: [
    { sku: "TEE-M", name: "T-shirt", quantity: 2, unitPrice: 20, weight: 0.25 },
    { sku: "MUG-1", name: 'Mug "classic"', quantity: 1, unitPrice: 12, weight: 0.5 },
  ],
  weightUnit: "lb",
  total: 52,
  currency: "USD",
  shippingMethod: "Standard",
};
