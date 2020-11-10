export interface ILoggingConfig {
  loggingLevel: string;
  profilingEnabled: boolean;
  elkConfig?: IElkConfig;
}

export interface IElkConfig {
  loggingLevel: string;
  environment: string;
  enabled: boolean;
}
