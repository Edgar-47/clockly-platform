import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      ".next-playwright/**",
      "node_modules/**",
      "out/**",
      "playwright-report/**",
      ".pytest_cache/**",
      ".ruff_cache/**",
      "test-results/**",
      "tsconfig.tsbuildinfo",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
