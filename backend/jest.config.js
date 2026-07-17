/** Jest config for the backend test suites, including the migration acceptance test
 * (docs/reference/report-format-library.md §5) which needs a live, migrated Postgres. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
};
