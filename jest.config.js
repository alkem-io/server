module.exports = {
  moduleNameMapper: {
    '@interfaces/(.*)': ['<rootDir>/src/interfaces/$1'],
    '@domain/(.*)': ['<rootDir>/src/domain/$1'],
    '@config/(.*)': ['<rootDir>/src/config/$1'],
    '@utils/(.*)': ['<rootDir>/src/utils/$1'],
    '@templates/(.*)': ['<rootDir>/src/templates/$1'],
    '@src/(.*)': ['<rootDir>/src/$1'],
    '@testing/(.*)': ['<rootDir>/test/$1'],
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: null,
  roots: ['<rootDir>/test', '<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec).ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
