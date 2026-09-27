import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const githubPages = process.env["GITHUB_PAGES"] === "true";
const base = process.env["BASE_PATH"] ?? "/Lume/";

export default defineConfig(
  githubPages
    ? {
        vite: { base },
        nitro: false,
        tanstackStart: {
          server: { entry: "server" },
          router: { basepath: base.replace(/\/$/, "") },
          spa: {
            enabled: true,
            prerender: { outputPath: "/index.html", crawlLinks: false },
          },
        },
      }
    : {
        tanstackStart: {
          server: { entry: "server" },
        },
      },
);
