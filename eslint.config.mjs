import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "scripts/**",
    "public/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Map SDK lifecycle often needs setState inside effects
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
