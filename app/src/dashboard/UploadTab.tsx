import { useState } from "react";
import { Badge, Box, Button, Card, SectionHelper, Text } from "@wix/design-system";
import { dashboard } from "@wix/dashboard";
import { planFulfilments, readShipments, type PlannedShipment, type PlanStatus } from "wix-stamps-bridge";
import { api, type FulfilResult, type StoreSettings } from "./api.ts";
import { FilePicker } from "./FilePicker.tsx";
import { SimpleTable } from "./table.tsx";

const STATUS: Record<PlanStatus, { label: string; skin: "success" | "neutralLight" | "warning" | "danger" }> = {
  ready: { label: "Ready", skin: "success" },
  already_shipped: { label: "Already shipped, skipped", skin: "neutralLight" },
  cancelled: { label: "Cancelled, skipped", skin: "warning" },
  not_ready: { label: "Not paid or approved, skipped", skin: "warning" },
  not_matched: { label: "No matching order", skin: "neutralLight" },
  no_tracking: { label: "No tracking number", skin: "danger" },
  extra_label: { label: "Extra label: add by hand", skin: "warning" },
};

export function UploadTab({ settings }: { settings: StoreSettings }) {
  const [fileName, setFileName] = useState<string>();
  const [plan, setPlan] = useState<PlannedShipment[]>();
  const [results, setResults] = useState<FulfilResult[]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const ready = plan?.filter((p) => p.status === "ready") ?? [];

  const onFile = async (text: string, name: string) => {
    setError(undefined);
    setResults(undefined);
    setPlan(undefined);
    setFileName(name);
    if (!settings.historyLayout) {
      setError("Set up your Stamps.com history layout in Setup first.");
      return;
    }
    setBusy(true);
    try {
      const rows = readShipments(text, settings.historyLayout);
      const numbers = rows.map((r) => r.orderNumber).filter(Boolean);
      const orders = numbers.length ? await api.orderStates(numbers) : [];
      setPlan(planFulfilments(rows, orders));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const done = await api.fulfil(
        ready.map((p) => ({ orderNumber: p.orderNumber, trackingNumber: p.trackingNumber, carrier: p.carrier })),
      );
      setResults(done);
      const shipped = done.filter((r) => r.outcome === "shipped").length;
      const failed = done.filter((r) => r.outcome === "failed").length;
      const message =
        `${shipped} order${shipped === 1 ? "" : "s"} marked as shipped.` +
        (failed ? ` ${failed} failed: see the list below.` : "");
      dashboard.showToast({ message, type: failed ? "error" : shipped ? "success" : "warning" });
      setPlan(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Card.Header
        title="Upload shipments"
        subtitle="In Stamps.com go to History, Search Print History, then Export. Upload that file here."
      />
      <Card.Divider />
      <Card.Content>
        <Box direction="vertical" gap="SP3">
          <FilePicker label="Choose history export" hint={fileName} onText={onFile} />
          {error && <SectionHelper skin="danger">{error}</SectionHelper>}
          {plan && (
            <>
              <Text weight="bold">{`Found ${plan.length} labels in ${fileName}`}</Text>
              <SimpleTable
                head={["Order", "Carrier", "Tracking number", "Status"]}
                rows={plan.map((p) => [
                  p.orderNumber ? `#${p.orderNumber}` : "-",
                  p.carrier || "-",
                  p.trackingNumber || "-",
                  <Badge size="small" skin={STATUS[p.status].skin}>
                    {STATUS[p.status].label}
                  </Badge>,
                ])}
              />
              <Box align="right">
                <Button onClick={confirm} disabled={busy || ready.length === 0}>
                  {`Confirm: mark ${ready.length} as shipped`}
                </Button>
              </Box>
            </>
          )}
          {results && (
            <SimpleTable
              head={["Order", "Result"]}
              rows={results.map((r) => [
                `#${r.orderNumber}`,
                r.outcome === "shipped" ? "Marked as shipped" : `${r.outcome === "skipped" ? "Skipped" : "Failed"}: ${r.message ?? ""}`,
              ])}
            />
          )}
        </Box>
      </Card.Content>
    </Card>
  );
}
