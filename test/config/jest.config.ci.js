module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(spec).ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
