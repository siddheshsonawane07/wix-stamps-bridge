import { extensions } from "@wix/astro/builders";
import settingsCollection from "./settings.ts";

export default extensions.dataCollections({
  id: "a15f5be6-b865-4105-abdb-38a1c821fb60",
  name: "Stamps Bridge data",
  collections: [settingsCollection],
});
