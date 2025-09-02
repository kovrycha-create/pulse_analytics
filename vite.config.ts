import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // use a different outDir to avoid permission issues on some filesystems
    outDir: "dist_build",
  },
});
