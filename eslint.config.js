import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

// `npm run lint`: ESLint's recommended rules for every file, and the
// Playwright plugin's for the specs. CI's Lint job fails on any error or
// warning. Turn a rule off here only with its reason; for one line, use an
// inline `eslint-disable-next-line <rule> -- <reason>`.
export default [
  {
    ignores: ['node_modules/', 'examples/', 'playwright-output/', 'playwright-report/', 'test-results/'],
  },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules: {
      // A leading underscore marks a parameter kept for its documented signature.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // These pass callbacks to the page (page.evaluate), which run in the
    // browser. Not the unit tests or scripts: they run only in Node.
    files: ['tests/*.spec.js', 'tests/*.setup.js', 'utils.js', 'test-helpers.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['tests/*.spec.js', 'tests/*.setup.js'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // The skeleton specs loop over siteConfig and check optional fields
      // only when they're set: conditionals are their design.
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      // Conditional skips with a reason are designed behavior (no login
      // configured, a PR without secrets). test.only stays an error.
      'playwright/no-skipped-test': 'off',
    },
  },
];
