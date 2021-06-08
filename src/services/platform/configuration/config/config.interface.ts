import { IAuthenticationConfig } from './authentication/authentication.config.interface';
import { ITemplate } from './template/template.interface';

export interface IConfig {
  authentication?: IAuthenticationConfig;
  template?: ITemplate;
}
