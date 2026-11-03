import { useRef } from "react";
import { Box, Button, Text } from "@wix/design-system";

/** A button that opens the file chooser and hands back the chosen CSV's text. */
export function FilePicker({ label, hint, onText }: { label: string; hint?: string; onText: (text: string, name: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <Box gap="SP2" verticalAlign="middle">
      <input
        ref={input}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onText(await file.text(), file.name);
          e.target.value = "";
        }}
      />
      <Button priority="secondary" onClick={() => input.current?.click()}>
        {label}
      </Button>
      {hint && (
        <Text size="small" secondary>
          {hint}
        </Text>
      )}
    </Box>
  );
}
