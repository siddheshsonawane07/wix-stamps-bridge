// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";
import wixHostingAdapter from "@wix/astro-wix-hosting-adapter";

// Matches the settings in Wix's own app template.
export default defineConfig({
  output: "server",
  adapter: wixHostingAdapter(),
  integrations: [wix(), react(), wixPages()],
  image: { domains: ["static.wixstatic.com"] },
  // The dashboard page calls the endpoints from Wix's dashboard origin. Endpoints check the caller's token instead.
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
  // Wix's hosting rejects deployments that contain server source maps (*.mjs.map).
  vite: { build: { sourcemap: false } },
});
