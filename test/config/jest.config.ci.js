/* eslint-disable import/no-commonjs */

module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(spec).ts'],
  // Exclude long-running integration parity bootstrap tests from CI runs
  // These tests require external services and are intentionally run only locally.
  testPathIgnorePatterns: ['<rootDir>/test/schema/bootstrap-parity.spec.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
