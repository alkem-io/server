import { IBearerStrategyOptionWithRequest } from 'passport-azure-ad';
import { defaultConfig } from './config'

export class AADConnectionFactory {
    public static GetOptions(): IBearerStrategyOptionWithRequest {

        const config : IBearerStrategyOptionWithRequest = process.env.AAD_CLIENT ? {
          identityMetadata: 'https://login.microsoftonline.com/' + process.env.AAD_TENANT + '/v2.0/.well-known/openid-configuration',
          clientID: process.env.AAD_CLIENT as string,
          validateIssuer: true,
          passReqToCallback: true,
          issuer: 'https://sts.windows.net/' + process.env.AAD_TENANT,
          audience: 'api://' + process.env.AAD_CLIENT,
          allowMultiAudiencesInToken: false,
          loggingLevel: 'info',
          scope: ['GraphQL.Update', 'GraphQL.Create', 'GraphQL.Query'],
          loggingNoPII: false
        } : defaultConfig;

        return config;
    }
}