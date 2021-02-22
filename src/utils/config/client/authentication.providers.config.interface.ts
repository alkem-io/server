import { IAadConfig } from './aad-config/aad.config.interface';
import { ISimpleAuthProviderConfig } from './aad-config/simple-auth.provider.config.interface';

export interface IAuthenticationProvidersConfig {
  aadConfig?: IAadConfig;
  simpleAuth?: ISimpleAuthProviderConfig;
}
