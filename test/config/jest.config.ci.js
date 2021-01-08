module.exports = {
  ...require('./jest.config'),
  testMatch: [
    '**/?(*.)+(spec).ts',
    '<rootDir>/test/functional/**/?(*.)+(it-spec).ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
