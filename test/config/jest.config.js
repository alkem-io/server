module.exports = {
  // Default: false
  // Automatically clear mock calls, instances, contexts and results before every test.
  // Equivalent to calling jest.clearAllMocks() before each test.
  // This does not remove any mock implementation that may have been provided.
  clearMocks: true,
  moduleNameMapper: {
    '^@interfaces/(.*)': '<rootDir>/src/common/interfaces/$1',
    '^@domain/(.*)': '<rootDir>/src/domain/$1',
    '^@common/(.*)': '<rootDir>/src/common/$1',
    '^@constants/(.*)': '<rootDir>/src/common/constants/$1',
    '^@core/(.*)': '<rootDir>/src/core/$1',
    '^@platform/(.*)': '<rootDir>/src/platform/$1',
    '^@config/(.*)': '<rootDir>/src/config/$1',
    '^@library/(.*)': '<rootDir>/src/library/$1',
    '^@services/(.*)': '<rootDir>/src/services/$1',
    '^@templates/(.*)': '<rootDir>/src/platform/configuration/templates/$1',
    '^@src/(.*)': '<rootDir>/src/$1',
    '^@test/(.*)': '<rootDir>/test/$1',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../../',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec).ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.service.ts',
    '<rootDir>/src/core/authentication/*.strategy.*',
    '<rootDir>/src/core/authorization/*.guard.*',
    '<rootDir>/src/core/middleware/*.*',
    '<rootDir>/src/core/logging/logging.profiling.decorator.ts',
    '<rootDir>/src/common/error-handling/http.exceptions.filter.ts',
  ],
  testTimeout: 90000,
  collectCoverage: true,
};
