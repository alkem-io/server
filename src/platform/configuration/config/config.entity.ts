import { IConfig } from './config.interface';
import { ITemplate } from './template/template.interface';
import { IAuthenticationConfig } from './authentication/authentication.config.interface';
import { IPlatformLocations } from './locations';
import { IPlatformFeatureFlag } from '../feature-flag/platform.feature.flag.interface';
export class Config extends IConfig {
  authentication?: IAuthenticationConfig;

  template?: ITemplate;

  platform?: IPlatformLocations;

  featureFlags?: IPlatformFeatureFlag[];
}
