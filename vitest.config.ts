import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    // Bound worker fan-out so Node 25+ does not time out while starting a
    // jsdom process for every test file on shared CI/developer machines.
    maxWorkers: 4,
    coverage: { reporter: ["text", "json", "html"] },
  },
});
