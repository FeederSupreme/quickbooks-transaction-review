import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("quickbooks-transaction-review", {
    source: github("FeederSupreme/quickbooks-transaction-review"),
    build: "npm run build",
    start: "next start",
  });

  return project("Quickbooks", {
    resources: [web],
  });
});
