import { IAuthenticationProviderConfig } from './providers/authentication.provider.config.interface';

export interface IAuthenticationConfig {
  enabled?: boolean;
  providers?: IAuthenticationProviderConfig[];
}
