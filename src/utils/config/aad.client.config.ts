import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('aad_client', () => ({
  msalConfig: {
    auth: {
      clientId: process.env.AUTH_AAD_CLIENT_APP_ID || '',
      authority: `https://login.microsoftonline.com/${process.env.AUTH_AAD_TENANT_ID}`,
      redirectUri:
        process.env.AUTH_AAD_CLIENT_LOGIN_REDIRECT_URI ||
        'http://localhost:3000',
    },
    cache: {
      cacheLocation: 'localStorage', // This configures where your cache will be stored
      storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
  },
  apiConfig: {
    resourceScope: process.env.AUTH_AAD_CHERRYTWIST_API_SCOPE || '',
  },
  loginRequest: {
    scopes: ['openid', 'profile', 'offline_access'],
  },
  tokenRequest: {
    scopes: [process.env.AUTH_AAD_CHERRYTWIST_API_SCOPE || ''],
  },
  silentRequest: {
    scopes: [
      'openid',
      'profile',
      process.env.AUTH_AAD_CHERRYTWIST_API_SCOPE || '',
    ],
  },
}));
