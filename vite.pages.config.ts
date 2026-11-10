import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "static-app",
  base: "/TARUK-COLLAB/",
  publicDir: "../public",
  plugins: [react(), {
    name: "publication-source",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: ".nojekyll", source: "" });
      this.emitFile({
        type: "asset", fileName: "version.json",
        source: JSON.stringify({ source_commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() }),
      });
    },
  }],
  build: { outDir: "../dist-pages", emptyOutDir: true },
});
