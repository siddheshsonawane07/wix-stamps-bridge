import { useEffect, useState } from "react";
import { Box, Loader, Page, SectionHelper, Tabs, WixDesignSystemProvider } from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { api, type StoreSettings } from "../../../../dashboard/api.ts";
import { SetupTab } from "../../../../dashboard/SetupTab.tsx";
import { ToShipTab } from "../../../../dashboard/ToShipTab.tsx";
import { UploadTab } from "../../../../dashboard/UploadTab.tsx";

type TabId = "to-ship" | "upload" | "setup";

export default function StampsBridgePage() {
  const [settings, setSettings] = useState<StoreSettings>();
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<TabId>("to-ship");

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        // A store that hasn't set up yet lands on Setup.
        if (!s.orderLayout || !s.startDate) setTab("setup");
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header
          title="Stamps Bridge"
          subtitle="Send paid orders to Stamps.com as a file, then upload the label history to mark them shipped."
        />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            <Tabs
              activeId={tab}
              onClick={(item) => setTab(item.id as TabId)}
              items={[
                { id: "to-ship", title: "To ship" },
                { id: "upload", title: "Upload shipments" },
                { id: "setup", title: "Setup" },
              ]}
            />
            {error && <SectionHelper skin="danger">{error}</SectionHelper>}
            {!settings && !error && (
              <Box align="center" padding="SP6">
                <Loader size="small" />
              </Box>
            )}
            {settings && tab === "to-ship" && <ToShipTab settings={settings} />}
            {settings && tab === "upload" && <UploadTab settings={settings} />}
            {settings && tab === "setup" && <SetupTab settings={settings} onSaved={setSettings} />}
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
}
