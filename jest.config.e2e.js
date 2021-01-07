module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(e2e-spec).ts','**/?(*.)+(it-spec).ts'],
  coverageDirectory: './coverage-e2e',
  testTimeout: 90000,
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.service.ts',
    '<rootDir>/src/utils/authentication/*.strategy.*',
    '<rootDir>/src/utils/authentication/*.guard.*',
    '<rootDir>/src/utils/decorators/*.*',
    '<rootDir>/src/utils/middleware/*.*',
    '<rootDir>/src/utils/logging/logging.profiling.decorator.ts',
    '<rootDir>/src/utils/error-handling/http.exceptions.filter.ts',
  ],
};
