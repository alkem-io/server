module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(test-update.it-spec).ts'],
  coverageDirectory: '<rootDir>/coverage-it',
};
