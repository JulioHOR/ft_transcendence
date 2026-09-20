import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/@react-three")) return "r3f";
          if (id.includes("node_modules/react-dom")) return "react-dom";
          if (id.includes("node_modules/react-router")) return "router";
          if (id.includes("node_modules/react/")) return "react";
        },
      },
    },
  },
});
