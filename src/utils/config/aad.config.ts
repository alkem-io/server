import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('aad', () => ({
  identityMetadata: `https://login.microsoftonline.com/${process.env.AAD_TENANT}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AAD_CLIENT || '',
  validateIssuer: true,
  passReqToCallback: true,
  issuer: `https://login.microsoftonline.com/${process.env.AAD_TENANT}/v2.0`,
  audience: process.env.AAD_CLIENT || '',
  allowMultiAudiencesInToken: false,
  loggingLevel: 'info',
  scope: ['Cherrytwist-GraphQL'],
  loggingNoPII: false,
}));
