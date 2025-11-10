import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import tsParser from '@typescript-eslint/parser';
import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});
const env = (prod: 0 | 1 | 2, dev: 0 | 1 | 2) =>
  process.env.NODE_ENV === 'production' ? prod : dev;

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'build/**',
      'coverage/**',
      'coverage-*/**',
      'tmp/**',
      '**/*.min.js',
      '.env*',
      '**/.eslintrc.js',
      'src/migrations/**',
    ],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
      },

      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin,
    },

    extends: compat.extends(
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended'
    ),

    rules: {
      quotes: ['error', 'single'],
      'no-console': env(1, 0),
      'no-debugger': env(1, 0),
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      '@typescript-eslint/no-unused-vars': [
        env(2, 1),
        {
          argsIgnorePattern: '^_',
        },
      ],

      'no-multiple-empty-lines': 'error',
    },
  },
  eslintPluginPrettierRecommended as any,
]);
