export interface IAadClientConfig {
  msalConfig?: IMsalConfig;
  apiConfig?: IAadApiConfig;
  loginRequest?: IAadScope;
  tokenRequest?: IAadScope;
  silentRequest?: IAadScope;
  authEnabled: boolean;
}

export interface IMsalConfig {
  auth: IMsalAuth;
  cache: IMsalCache;
}

export interface IMsalAuth {
  clientId: string;
  authority: string;
  redirectUri: string;
}

export interface IMsalCache {
  cacheLocation: string;
  storeAuthStateInCookie: boolean;
}

export interface IAadScope {
  scopes: string[];
}

export interface IAadApiConfig {
  resourceScope: string;
}
