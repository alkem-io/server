export interface ILoggingConfig {
  loggingLevel: string;
  loggingExceptionsEnabled: boolean;
  profilingEnabled: boolean;
  elkConfig?: IElkConfig;
}

export interface IElkConfig {
  loggingLevel: string;
  environment: string;
  enabled: boolean;
}
