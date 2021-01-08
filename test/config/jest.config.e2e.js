module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(e2e-spec).ts'],
  coverageDirectory: '<rootDir>/coverage-e2e',
};
