/// <reference types="vitest" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "data",
  test: {
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
