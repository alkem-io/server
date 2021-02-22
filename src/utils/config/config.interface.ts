import { IAuthenticationProvidersConfig } from './client/authentication.providers.config.interface';
import { ITemplate } from './template/template.interface';

export interface IConfig {
  authenticationProviders?: IAuthenticationProvidersConfig;
  template?: ITemplate;
}
