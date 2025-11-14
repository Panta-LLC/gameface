// Flat ESLint config for the Gameface monorepo (ESLint v9)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  { ignores: ['dist', 'build', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
  },
];
