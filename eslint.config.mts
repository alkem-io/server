import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

const env = (prod: 0 | 1 | 2, dev: 0 | 1 | 2) =>
  process.env.NODE_ENV === 'production' ? prod : dev;

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
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
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
      },

      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },

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
