import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('ms-graph', () => ({
  clientID: process.env.AUTH_AAD_CHERRYTWIST_API_APP_ID || '',
  clientSecret: process.env.AUTH_AAD_MSGRAPH_API_SECRET || '',
  scope: process.env.AUTH_AAD_MSGRAPH_API_SCOPE || '',
}));
