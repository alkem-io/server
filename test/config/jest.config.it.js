module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(it-spec).ts'],
  coverageDirectory: '<rootDir>/coverage-it',
};
