import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('oidc', () => ({
  metadataEndpoint: `https://login.microsoftonline.com/${process.env.AUTH_AAD_TENANT}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AUTH_AAD_CHERRYTWIST_API_APP_ID || '',
  clientSecret: process.env.AUTH_AAD_MSGRAPH_API_SECRET || '',
  passReqToCallback: true,
  issuer: `https://login.microsoftonline.com/${process.env.AUTH_AAD_TENANT}/v2.0`,
  scope: ['Cherrytwist-GraphQL'],
}));
