import { useEffect, useState } from "react";
import { Box, Button, Card, Loader, SectionHelper, Text } from "@wix/design-system";
import { buildOrdersCsv, checkOrderLayout } from "wix-stamps-bridge";
import { api, downloadText, today, type OrdersToShip, type StoreSettings } from "./api.ts";
import { SimpleTable } from "./table.tsx";

export function ToShipTab({ settings }: { settings: StoreSettings }) {
  const [data, setData] = useState<OrdersToShip>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await api.ordersToShip());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings.startDate) void load();
  }, [settings.startDate]);

  const layoutProblems = settings.orderLayout ? checkOrderLayout(settings.orderLayout) : ["Upload your Stamps.com sample.csv in Setup first."];
  const setupMissing = !settings.startDate ? "Set 'Only include orders from' in Setup first." : layoutProblems[0];

  const download = () => {
    if (!data || !settings.orderLayout) return;
    downloadText(`stamps-orders-${today()}.csv`, buildOrdersCsv(settings.orderLayout, data.orders));
  };

  return (
    <Card>
      <Card.Header
        title={data ? `${data.orders.length} paid orders waiting to ship` : "Orders waiting to ship"}
        subtitle={settings.startDate ? `Showing orders placed since ${settings.startDate}` : undefined}
        suffix={
          <Box gap="SP2">
            <Button priority="secondary" onClick={load} disabled={loading || !settings.startDate}>
              Refresh
            </Button>
            <Button onClick={download} disabled={!data || data.orders.length === 0 || !!setupMissing}>
              {`Download for Stamps.com${data ? ` (${data.orders.length})` : ""}`}
            </Button>
          </Box>
        }
      />
      <Card.Divider />
      <Card.Content>
        <Box direction="vertical" gap="SP3">
          {setupMissing && <SectionHelper skin="warning">{setupMissing}</SectionHelper>}
          {error && <SectionHelper skin="danger">{error}</SectionHelper>}
          {data?.truncated && (
            <SectionHelper skin="warning">
              {`Showing the oldest ${data.orders.length} orders. There are more: they'll appear here once these are shipped.`}
            </SectionHelper>
          )}
          {data && data.missingWeight.length > 0 && (
            <SectionHelper skin="warning">
              {`Orders with an item that has no weight: ${data.missingWeight.map((n) => `#${n}`).join(", ")}. Add weights in Wix, or enter them in Stamps.com.`}
            </SectionHelper>
          )}
          {data && data.noAddress.length > 0 && (
            <SectionHelper skin="standard">
              {`Left out because there is no shipping address (for example pickup): ${data.noAddress.map((n) => `#${n}`).join(", ")}.`}
            </SectionHelper>
          )}
          {loading && (
            <Box align="center" padding="SP4">
              <Loader size="small" />
            </Box>
          )}
          {data && !loading && data.orders.length === 0 && <Text secondary>Nothing to ship right now.</Text>}
          {data && !loading && data.orders.length > 0 && (
            <SimpleTable
              head={["Order", "Date", "Customer", "Ship to", "Items"]}
              rows={data.orders.map((o) => [
                `#${o.number}`,
                o.createdAt.slice(0, 10),
                o.recipient.fullName,
                `${o.recipient.city}, ${o.recipient.countryCode}`,
                String(o.items.reduce((sum, i) => sum + i.quantity, 0)),
              ])}
            />
          )}
        </Box>
      </Card.Content>
    </Card>
  );
}
