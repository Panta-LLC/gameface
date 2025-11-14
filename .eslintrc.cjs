module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { tsconfigRootDir: __dirname, project: ['./tsconfig.base.json'] },
  env: { node: true, es2022: true, browser: true },
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  rules: {
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    'import/order': 'off',
    'unused-imports/no-unused-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'build', 'node_modules']
};
