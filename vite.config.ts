// xpell-core/vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "XpellCore",
      formats: ["es", "cjs"],
      fileName: (format) =>
        format === "es" ? "xpell-core.es.js" : "xpell-core.cjs.js",
    },
    rollupOptions: {
      external: [],
      output: { exports: "named" },
    },
    outDir: "dist",
  },
});
