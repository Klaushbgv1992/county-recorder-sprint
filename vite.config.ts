/// <reference types="vitest" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "data",
  build: {
    manifest: true,
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      ".claude/worktrees/**",
      ".worktrees/**",
    ],
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
