import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist", // output folder
    sourcemap: false, // true if you want maps
    minify: "esbuild", // or 'terser'
    rollupOptions: {
      input: "index.html", // custom entry point
    },
  },
});
