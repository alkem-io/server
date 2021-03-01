import { IApiConfig } from './api-config/api.config.interface';
import { IMsalConfig } from './msal-config/msal.config.interface';
import { IScope } from './scope/scope.interface';

export interface IAadConfig {
  msalConfig?: IMsalConfig;
  apiConfig?: IApiConfig;
  loginRequest?: IScope;
  tokenRequest?: IScope;
  silentRequest?: IScope;
}
