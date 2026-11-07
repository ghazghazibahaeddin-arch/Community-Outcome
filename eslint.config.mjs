import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    ignores: ["worker-configuration.d.ts", ".open-next/**", ".wrangler/**"]
  },
  {
    extends: [...next],
  }
]);
