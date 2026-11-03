import { useState, type ChangeEvent } from "react";
import { Badge, Box, Button, Card, Dropdown, Input, SectionHelper, Text } from "@wix/design-system";
import { dashboard } from "@wix/dashboard";
import {
  checkHistoryLayout,
  checkOrderLayout,
  diffHeaders,
  FIELD_BY_ID,
  historyLayoutFromExport,
  layoutFromSample,
  mergeLayouts,
  parseCsv,
  WIX_FIELDS,
  type ColumnMapping,
  type ColumnSource,
  type HistoryLayout,
  type OrderLayout,
} from "wix-stamps-bridge";
import { api, type StoreSettings } from "./api.ts";
import { FilePicker } from "./FilePicker.tsx";
import { SimpleTable } from "./table.tsx";

const SOURCE_OPTIONS = [
  { id: "blank", value: "Leave blank" },
  { id: "fixed", value: "Fixed value" },
  ...WIX_FIELDS.map((f) => ({ id: `field:${f.id}`, value: f.label })),
];

function sourceId(source: ColumnSource): string {
  return source.kind === "field" ? `field:${source.field}` : source.kind;
}

const MATCHED: Record<ColumnMapping["matchedBy"], { label: string; skin: "success" | "standard" | "warning" }> = {
  list: { label: "From the fixed list", skin: "success" },
  store: { label: "Chosen by you", skin: "standard" },
  none: { label: "No match: choose", skin: "warning" },
};

const HISTORY_FIELDS: Array<{ key: keyof HistoryLayout; label: string }> = [
  { key: "orderId", label: "Order ID (required)" },
  { key: "trackingNumber", label: "Tracking number (required)" },
  { key: "carrier", label: "Carrier" },
  { key: "service", label: "Service" },
];

const CARRIERS = ["UPS", "USPS", "FedEx", "DHL"].map((c) => ({ id: c, value: c }));

export function SetupTab({ settings, onSaved }: { settings: StoreSettings; onSaved: (s: StoreSettings) => void }) {
  const [layout, setLayout] = useState<OrderLayout | undefined>(settings.orderLayout);
  const [changes, setChanges] = useState<{ added: string[]; removed: string[] }>();
  const [historyHeaders, setHistoryHeaders] = useState<string[]>();
  const [history, setHistory] = useState<HistoryLayout>(settings.historyLayout ?? {});
  const [startDate, setStartDate] = useState(settings.startDate ?? "");
  const [carrier, setCarrier] = useState(settings.defaultCarrier ?? "UPS");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const save = async (patch: StoreSettings, message: string) => {
    setSaving(true);
    setError(undefined);
    try {
      onSaved(await api.saveSettings(patch));
      dashboard.showToast({ message, type: "success" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onSample = (text: string) => {
    setError(undefined);
    try {
      const next = layoutFromSample(text);
      if (settings.orderLayout) {
        setChanges(diffHeaders(settings.orderLayout, next));
        setLayout(mergeLayouts(settings.orderLayout, next));
      } else {
        setChanges(undefined);
        setLayout(next);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onHistory = (text: string) => {
    setError(undefined);
    try {
      setHistoryHeaders(parseCsv(text)[0] ?? []);
      setHistory(historyLayoutFromExport(text));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const updateColumn = (index: number, source: ColumnSource) => {
    if (!layout) return;
    const columns = layout.columns.map((c, i) => (i === index ? { ...c, source, matchedBy: "store" as const } : c));
    setLayout({ columns });
  };

  const orderProblems = layout ? checkOrderLayout(layout) : [];
  const historyProblems = checkHistoryLayout(history);
  const matchedCount = layout?.columns.filter((c) => c.matchedBy === "list").length ?? 0;

  return (
    <Box direction="vertical" gap="SP4">
      {error && <SectionHelper skin="danger">{error}</SectionHelper>}

      <Card>
        <Card.Header
          title="Step 1  Your Stamps.com order layout"
          subtitle="In Stamps.com go to Orders, Import, then Download sample file. Upload that sample.csv here. Only its header row is used."
        />
        <Card.Divider />
        <Card.Content>
          <Box direction="vertical" gap="SP3">
            <FilePicker
              label={layout ? "Upload a new sample" : "Upload sample.csv"}
              hint={layout ? `${layout.columns.length} columns · ${matchedCount} matched from the list` : undefined}
              onText={onSample}
            />
            {changes && (changes.added.length > 0 || changes.removed.length > 0) && (
              <SectionHelper skin="standard">
                {`Changed since your last sample. Added: ${changes.added.join(", ") || "none"}. Removed: ${changes.removed.join(", ") || "none"}.`}
              </SectionHelper>
            )}
            {layout && (
              <>
                <SimpleTable
                  head={["Stamps.com column", "Fill with", "", "Matched by"]}
                  rows={layout.columns.map((c, i) => {
                    const field = c.source.kind === "field" ? FIELD_BY_ID.get(c.source.field) : undefined;
                    return [
                      c.header,
                      <Dropdown
                        size="small"
                        options={SOURCE_OPTIONS}
                        selectedId={sourceId(c.source)}
                        onSelect={(option: { id: string | number }) => {
                          const id = String(option.id);
                          if (id === "blank") updateColumn(i, { kind: "blank" });
                          else if (id === "fixed") updateColumn(i, { kind: "fixed", value: "" });
                          else {
                            const f = FIELD_BY_ID.get(id.slice("field:".length));
                            updateColumn(i, { kind: "field", field: id.slice("field:".length), format: f?.formats?.[0] });
                          }
                        }}
                      />,
                      c.source.kind === "fixed" ? (
                        <Input
                          size="small"
                          value={c.source.value}
                          placeholder="Value for every row"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateColumn(i, { kind: "fixed", value: e.target.value })}
                        />
                      ) : field?.formats && c.source.kind === "field" ? (
                        <Dropdown
                          size="small"
                          options={field.formats.map((f) => ({ id: f, value: f }))}
                          selectedId={c.source.format ?? field.formats[0]}
                          onSelect={(option: { id: string | number }) =>
                            c.source.kind === "field" && updateColumn(i, { ...c.source, format: String(option.id) })
                          }
                        />
                      ) : (
                        ""
                      ),
                      <Badge size="small" skin={MATCHED[c.matchedBy].skin}>
                        {MATCHED[c.matchedBy].label}
                      </Badge>,
                    ];
                  })}
                />
                {orderProblems.map((p) => (
                  <SectionHelper key={p} skin="warning">
                    {p}
                  </SectionHelper>
                ))}
                <Text size="small" secondary>
                  Headers are kept word for word and in the same order, as Stamps.com requires.
                </Text>
                <Box align="right">
                  <Button disabled={saving} onClick={() => save({ orderLayout: layout }, "Order layout saved.")}>
                    Save layout
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header
          title="Step 2  Your Stamps.com history layout"
          subtitle="Print one label for an imported order, export it from History, and upload that file here."
        />
        <Card.Divider />
        <Card.Content>
          <Box direction="vertical" gap="SP3">
            <FilePicker label="Upload a history export" onText={onHistory} />
            <SimpleTable
              head={["The app needs", "Column in your file"]}
              rows={HISTORY_FIELDS.map(({ key, label }) => [
                label,
                historyHeaders ? (
                  <Dropdown
                    size="small"
                    placeholder="Choose a column"
                    options={[{ id: "", value: "Not in this file" }, ...historyHeaders.map((h) => ({ id: h, value: h }))]}
                    selectedId={history[key] ?? ""}
                    onSelect={(option: { id: string | number }) =>
                      setHistory({ ...history, [key]: option.id === "" ? undefined : String(option.id) })
                    }
                  />
                ) : (
                  history[key] ?? "Not set"
                ),
              ])}
            />
            {historyProblems.map((p) => (
              <SectionHelper key={p} skin="warning">
                {p}
              </SectionHelper>
            ))}
            <Box align="right">
              <Button disabled={saving || historyProblems.length > 0} onClick={() => save({ historyLayout: history }, "History layout saved.")}>
                Save history layout
              </Button>
            </Box>
          </Box>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header title="Step 3  Everyday settings" />
        <Card.Divider />
        <Card.Content>
          <Box direction="vertical" gap="SP3">
            <Box direction="vertical" gap="SP1">
              <Text size="small" weight="bold">
                Only include orders from
              </Text>
              <Input
                value={startDate}
                placeholder="YYYY-MM-DD"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              />
              <Text size="small" secondary>
                Orders placed before this date are never sent to Stamps.com. Set it to the day you start using the app.
              </Text>
            </Box>
            <Box direction="vertical" gap="SP1">
              <Text size="small" weight="bold">
                Default carrier
              </Text>
              <Dropdown
                options={CARRIERS}
                selectedId={carrier}
                onSelect={(option: { id: string | number }) => setCarrier(String(option.id))}
              />
              <Text size="small" secondary>
                Used for the tracking link when the history export doesn't say which carrier.
              </Text>
            </Box>
            <Box align="right">
              <Button
                disabled={saving || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)}
                onClick={() => save({ startDate, defaultCarrier: carrier }, "Settings saved.")}
              >
                Save settings
              </Button>
            </Box>
          </Box>
        </Card.Content>
      </Card>
    </Box>
  );
}
