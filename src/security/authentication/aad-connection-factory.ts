import { IBearerStrategyOptionWithRequest } from 'passport-azure-ad';

export class AADConnectionFactory {
  public static GetOptions(): IBearerStrategyOptionWithRequest {
    const config: IBearerStrategyOptionWithRequest = {
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
    };

    return config;
  }
}
