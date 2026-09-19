import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    ".next-test/**",
    ".next-auth-test/**",
    ".next-smoke/**",
    ".next-demo-test/**",
    "next-env.d.ts",
  ]),
]);
