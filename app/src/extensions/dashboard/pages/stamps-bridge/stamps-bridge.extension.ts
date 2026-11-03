import { extensions } from "@wix/astro/builders";

export default extensions.dashboardPage({
  id: "9d4b5fe8-d551-4a92-876b-94b6f1469b9a",
  title: "Stamps Bridge",
  routePath: "stamps-bridge",
  component: "./extensions/dashboard/pages/stamps-bridge/stamps-bridge.tsx",
  priority: 0,
  metaData: {
    searchable: true,
    title: "Stamps Bridge",
    description: "Send paid orders to Stamps.com as a file and bring tracking numbers back to mark orders shipped.",
  },
});
