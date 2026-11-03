import type { ReactNode } from "react";
import { Text } from "@wix/design-system";

/** A plain table. The design system's Table is built for large data sets; this page only lists a day's orders. */
export function SimpleTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  const cell = { padding: "10px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "left" as const, verticalAlign: "middle" as const };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} style={cell}>
              <Text size="small" weight="bold" secondary>
                {h}
              </Text>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((value, j) => (
              <td key={j} style={cell}>
                {typeof value === "string" || typeof value === "number" ? <Text size="small">{value}</Text> : value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
