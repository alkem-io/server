/* eslint-disable import/no-commonjs */

module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(spec).ts'],
  // Exclude long-running integration parity bootstrap tests from CI runs
  testPathIgnorePatterns: ['<rootDir>/test/schema/bootstrap-parity.spec.ts'],
  // Disable coverage collection for quick CI runs where coverage gating is handled separately
  collectCoverage: false,
};
