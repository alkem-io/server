import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('aad', () => ({
  identityMetadata: `https://login.microsoftonline.com/${process.env.AAD_TENANT}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AAD_CLIENT || '',
  validateIssuer: true,
  passReqToCallback: true,
  issuer: `https://login.microsoftonline.com/${process.env.AAD_TENANT}/v2.0`,
  audience: process.env.AAD_CLIENT || '',
  allowMultiAudiencesInToken: false,
  loggingLevel: process.env.AAD_LOGGING_LEVEL || AAD_LOGGING_LEVEL.Error,
  scope: ['Cherrytwist-GraphQL'],
  loggingNoPII: process.env.AAD_LOGGING_NO_PII || true,
}));

export enum AAD_LOGGING_LEVEL {
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
  Verbose = 'Verbose',
}
