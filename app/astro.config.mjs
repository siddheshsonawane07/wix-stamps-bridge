// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";
import wixHostingAdapter from "@wix/astro-wix-hosting-adapter";

export default defineConfig({
  integrations: [react(), wix(), wixPages()],
  adapter: wixHostingAdapter(),
});
