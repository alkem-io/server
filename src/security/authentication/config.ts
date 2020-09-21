import { IBearerStrategyOptionWithRequest } from 'passport-azure-ad';

export const defaultConfig: IBearerStrategyOptionWithRequest = {
  // Requried
  identityMetadata: 'https://login.microsoftonline.com/2570f136-86fa-4ec4-b18d-cb07a1755e35/v2.0/.well-known/openid-configuration',
  // or 'https://login.microsoftonline.com/<your_tenant_guid>/.well-known/openid-configuration'
  // or you can use the common endpoint
  // 'https://login.microsoftonline.com/common/.well-known/openid-configuration'

  // Required
  clientID: '1400d97a-a25d-46e7-8d67-a67cbe2f4fb2',

  // Required.
  // If you are using the common endpoint, you should either set `validateIssuer` to false, or provide a value for `issuer`.
  validateIssuer: true,

  // Required.
  // Set to true if you use `function(req, token, done)` as the verify callback.
  // Set to false if you use `function(req, token)` as the verify callback.
  passReqToCallback: true,

  // Required if you are using common endpoint and setting `validateIssuer` to true.
  // For tenant-specific endpoint, this field is optional, we will use the issuer from the metadata by default.
  issuer: 'https://sts.windows.net/2570f136-86fa-4ec4-b18d-cb07a1755e35/',

  // Optional, default value is clientID
  audience: 'api://1400d97a-a25d-46e7-8d67-a67cbe2f4fb2',

  // Optional. Default value is false.
  // Set to true if you accept access_token whose `aud` claim contains multiple values.
  allowMultiAudiencesInToken: false,

  // Optional. 'error', 'warn' or 'info'
  loggingLevel: 'info',

  scope: ['GraphQL.Update', 'GraphQL.Create', 'GraphQL.Query'],

  loggingNoPII: false
};