import { IAadConfig } from './aad/aad.config.interface';
import { ISimpleAuthProviderConfig } from './simple-auth/simple-auth.provider.config.interface';

export interface IAuthenticationProvidersConfig {
  aadConfig?: IAadConfig;
  simpleAuth?: ISimpleAuthProviderConfig;
}
