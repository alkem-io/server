import { IBearerStrategyOptionWithRequest } from 'passport-azure-ad';
import { LoadConfiguration } from '../../configuration-loader';

export class AADConnectionFactory {
    public static GetOptions(): IBearerStrategyOptionWithRequest {

        LoadConfiguration();

        if(!process.env.AAD_CLIENT)
          throw new Error('No AAD_CLIENT environment variable set!');

        if(!process.env.AAD_TENANT)
          throw new Error('No AAD_TENANT environment variable set!');

        const config : IBearerStrategyOptionWithRequest = {
          identityMetadata: `https://login.microsoftonline.com/${process.env.AAD_TENANT}/v2.0/.well-known/openid-configuration`,
          clientID: process.env.AAD_CLIENT || '',
          validateIssuer: true,
          passReqToCallback: true,
          issuer: `https://login.microsoftonline.com/${process.env.AAD_TENANT}/v2.0`,
          audience: process.env.AAD_CLIENT || '',
          allowMultiAudiencesInToken: false,
          loggingLevel: 'info',
          scope: ['Cherrytwist-GraphQL'],
          loggingNoPII: false
        };

        return config;
    }
}