import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "XpellCore", // UMD global name (fine)
      fileName: (format) =>
        format === "es"
          ? "xpell-core.es.js"   // ⬅ ES module bundle
          : "xpell-core.cjs.js"  // ⬅ CJS bundle
    },
    rollupOptions: {
      external: [], // add externals here later if needed
      output: {
        exports: "named"
      }
    },
    outDir: "dist"
  }
});
