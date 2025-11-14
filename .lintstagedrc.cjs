module.exports = {
  '**/*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  '**/*.{json,md,css,scss,html,yml,yaml}': [
    'prettier --write'
  ]
};
