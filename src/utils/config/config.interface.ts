import { IAuthenticationProviderConfig } from './authentication-providers/authentication.provider.config.interface';
import { ITemplate } from './template/template.interface';

export interface IConfig {
  authenticationProviders?: IAuthenticationProviderConfig[];
  template?: ITemplate;
}
