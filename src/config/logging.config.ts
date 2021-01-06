import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('logging', () => ({
  consoleLoggingEnabled:
    process.env.LOGGING_CONSOLE_ENABLED?.toLocaleLowerCase() !== 'false',
  loggingLevel:
    process.env.LOGGING_LEVEL_CONSOLE?.toLowerCase() ||
    LOGGING_LEVEL.Error.toString().toLowerCase(),
  profilingEnabled:
    process.env.LOGGING_PROFILING_ENABLED?.toLocaleLowerCase() === 'true',
  elkConfig: {
    enabled: process.env.LOGGING_ELK_ENABLED?.toLocaleLowerCase() === 'true',
    loggingLevel:
      process.env.LOGGING_LEVEL_ELK?.toLowerCase() ||
      LOGGING_LEVEL.Error.toString().toLowerCase(),
    environment:
      process.env.ENVIRONMENT?.toLowerCase() ||
      ENVIRONMENT.Dev.toString().toLowerCase(),
  },
}));

export enum LOGGING_LEVEL {
  Error = 0,
  Warn = 1,
  Info = 2,
  Http = 3,
  Verbose = 4,
  Debug = 5,
  Silly = 6,
}

export enum ENVIRONMENT {
  Dev = 0,
  Test = 1,
  Acceptance = 2,
  Production = 3,
}
