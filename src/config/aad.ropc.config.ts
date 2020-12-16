import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('aad_ropc', () => ({
  clientID: process.env.AUTH_AAD_CLIENT_APP_ID || '',
  clientSecret: process.env.AUTH_AAD_CLIENT_APP_SECRET || '',
  scope: process.env.AUTH_AAD_CHERRYTWIST_API_SCOPE || '',
  tenant: process.env.AUTH_AAD_TENANT || '',
  username: process.env.AUTH_AAD_USER_UPN || '',
  password: process.env.AUTH_AAD_USER_PASSWORD || '',
}));
