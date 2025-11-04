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
    // Schema contract feature: include diffing, governance, deprecation & bootstrap modules
    '<rootDir>/src/schema-contract/**/*.ts',
    '<rootDir>/src/schema-bootstrap/**/*.ts',
  ],
  testTimeout: 90000,
  collectCoverage: true,
  // Coverage gate scoped to schema-contract feature per specification intent.
  // We intentionally avoid a harsh global threshold (legacy code below target) and
  // enforce high coverage only on the new feature path. Additional paths can
  // be onboarded incrementally.
  // NOTE: Jest matches coverageThreshold keys against individual file paths.
  // Using a directory with <rootDir> prevented a match (exit code 1: "Coverage data ... was not found").
  // We switch to a relative directory pattern so all files under schema-contract contribute.
  // Future: once weaker areas (governance, deprecation registry, snapshot loader, diff-types) are
  // strengthened we can consider splitting thresholds per sub-path if needed.
  coverageThreshold: {
    // Granular thresholds reflecting current maturity of submodules.
    // High targets (>=90%) for core diff & classification; governance & deprecation
    // logic will be iteratively raised as additional scenarios are codified.
    'src/schema-contract/classify/': {
      lines: 90,
      statements: 90,
      functions: 90,
      branches: 85,
    },
    'src/schema-contract/diff/': {
      lines: 85,
      statements: 80,
      functions: 90,
      branches: 75,
    },
    'src/schema-contract/governance/': {
      lines: 75,
      statements: 70,
      functions: 65,
      branches: 60,
    },
    'src/schema-contract/deprecation/': {
      lines: 70,
      statements: 70,
      functions: 75,
      branches: 60,
    },
    'src/schema-contract/model/': {
      lines: 100,
      statements: 100,
      functions: 100,
      branches: 100,
    },
    // Snapshot loader is intentionally lightweight; minimal threshold now, can raise later.
    'src/schema-contract/snapshot/': {
      lines: 50,
      statements: 50,
      functions: 50,
      branches: 0,
    },
  },
};
