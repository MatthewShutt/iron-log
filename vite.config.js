import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base so assets resolve correctly at username.github.io/repo-name/
  base: "./",
});
