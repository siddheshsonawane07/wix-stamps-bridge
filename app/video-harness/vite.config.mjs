// Renders the app's real dashboard tabs with example data, for screenshots in the demo video.
// Only the Wix connections are swapped for stand-ins; every component is the app's own code.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here("."),
  plugins: [
    react(),
    {
      name: "example-data-api",
      enforce: "pre",
      resolveId(source, importer) {
        // The tabs import "./api.ts"; the page imports ".../dashboard/api.ts". Both get the example-data stand-in.
        const isApi = (source === "./api.ts" && importer?.includes("/src/dashboard/")) || source.endsWith("/dashboard/api.ts");
        if (isApi && !importer?.endsWith("mock-api.ts")) return here("./mock-api.ts");
        if (source === "@wix/dashboard") return here("./mock-dashboard.ts");
        return null;
      },
    },
  ],
  server: { port: 5199, strictPort: true, fs: { allow: [here("../..")] } },
});
