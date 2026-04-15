import { createRequire } from "node:module";

// eslint-config-next 16.x ships native flat configs. Importing them directly
// avoids FlatCompat/@eslint/eslintrc, which crashes with "Converting circular
// structure to JSON" when it tries to validate eslint-plugin-react's flat
// config (plugin.configs.flat.*.plugins.react references the plugin itself).
const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "tests/**",
      "src/__tests__/**",
      "scripts/**",
      "temp-test-files/**",
      "playwright-report/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;
