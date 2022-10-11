import { IConfig } from './config.interface';
import { ITemplate } from './template/template.interface';
import { IAuthenticationConfig } from './authentication/authentication.config.interface';
import { IPlatformConfig } from './platform';
export class Config extends IConfig {
  authentication?: IAuthenticationConfig;

  template?: ITemplate;

  platform?: IPlatformConfig;
}
