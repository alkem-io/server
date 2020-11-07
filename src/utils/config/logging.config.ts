import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('logging', () => ({
  loggingLevel:
    process.env.LOGGING_LEVEL?.toLowerCase() ||
    LOGGING_LEVEL.Error.toString().toLowerCase(),
  profilingEnabled:
    process.env.LOGGING_PROFILING_ENABLED?.toLocaleLowerCase() === 'true',
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
