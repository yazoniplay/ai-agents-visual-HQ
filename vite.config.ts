import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this project from /<repository-name>/.
  base: "/ai-agents-visual-HQ/",
  plugins: [react()],
});
