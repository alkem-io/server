export interface ILoggingConfig {
  loggingLevel: string;
  consoleLoggingEnabled: boolean;
  profilingEnabled: boolean;
  elkConfig?: IElkConfig;
}

export interface IElkConfig {
  loggingLevel: string;
  environment: string;
  enabled: boolean;
}
