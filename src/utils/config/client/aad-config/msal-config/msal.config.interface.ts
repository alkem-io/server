import { IMsalAuth } from './msal.auth.interface';
import { IMsalCache } from './msal.cache.interface';

export interface IMsalConfig {
  auth: IMsalAuth;
  cache: IMsalCache;
}
