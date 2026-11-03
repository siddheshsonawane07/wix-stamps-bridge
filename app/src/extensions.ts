import { app } from "@wix/astro/builders";
import stampsBridgePage from "./extensions/dashboard/pages/stamps-bridge/stamps-bridge.extension.ts";
import dataCollections from "./extensions/backend/data-collections/data-collections.extension.ts";

export default app().use(stampsBridgePage).use(dataCollections);
