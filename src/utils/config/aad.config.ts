import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('aad', () => ({
  identityMetadata: `https://login.microsoftonline.com/${process.env.AUTH_AAD_TENANT}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AUTH_AAD_CHERRYTWIST_API_APP_ID || '',
  validateIssuer: true,
  passReqToCallback: true,
  issuer: `https://login.microsoftonline.com/${process.env.AUTH_AAD_TENANT}/v2.0`,
  audience: process.env.AUTH_AAD_CHERRYTWIST_API_APP_ID || '',
  allowMultiAudiencesInToken: false,
  loggingLevel: process.env.AUTH_AAD_LOGGING_LEVEL || AAD_LOGGING_LEVEL.Error,
  scope: ['Cherrytwist-GraphQL'],
  loggingNoPII: !process.env.AUTH_AAD_LOGGING_PII || true,
  upnDomain:
    process.env.AUTH_AAD_UPN_DOMAIN || 'playgroundcherrytwist.onmicrosoft.com',
  tenant: process.env.AUTH_AAD_TENANT || '',
}));

export enum AAD_LOGGING_LEVEL {
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
  Verbose = 'Verbose',
}
