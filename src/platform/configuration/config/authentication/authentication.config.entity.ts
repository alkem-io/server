import { IAuthenticationConfig } from './authentication.config.interface';
import { IAuthenticationProviderConfig } from './providers/authentication.provider.config.interface';
export class AuthenticationConfig extends IAuthenticationConfig {
  enabled?: boolean;
  providers?: IAuthenticationProviderConfig[];
}
