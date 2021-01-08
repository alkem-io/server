module.exports = {
  ...require('./jest.config'),
  testMatch: [
    '**/?(*.)+(spec).ts',
    '**/?(*.)+(it-spec).ts',
    '**/?(*.)+(e2e-spec).ts',
  ],
  coverageDirectory: '<rootDir>/coverage-nightly',
};
