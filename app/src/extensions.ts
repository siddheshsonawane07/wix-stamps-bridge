import { app } from "@wix/astro/builders";
import stampsBridgePage from "./extensions/dashboard/pages/stamps-bridge/stamps-bridge.extension.ts";

export default app().use(stampsBridgePage);
