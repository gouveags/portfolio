import { defineConfig } from "astro/config";
export default defineConfig({
  site: "https://gouveagsportfolio.vercel.app",
  output: "static",
  trailingSlash: "always",
  server: { host: "0.0.0.0", port: 4173 },
  vite: { server: { allowedHosts: ["terminal.local"] } },
});
