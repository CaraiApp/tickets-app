import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    extends: [
      eslint.configs.recommended,
      ...compat.extends("next/core-web-vitals")
    ],
    plugins: {
      '@next/next': nextPlugin
    },
    rules: {
      // Configuraciones personalizadas de reglas si las necesitas
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn',
    }
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'public/'
    ]
  }
];