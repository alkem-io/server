import { IBearerStrategyOptionWithRequest } from 'passport-azure-ad';

export const defaultConfig: IBearerStrategyOptionWithRequest = {
  // Requried
  identityMetadata: 'https://login.microsoftonline.com/22e3aada-5a09-4e2b-9e0e-dc4f02328b29/v2.0/.well-known/openid-configuration',
  // or 'https://login.microsoftonline.com/<your_tenant_guid>/.well-known/openid-configuration'
  // or you can use the common endpoint
  // 'https://login.microsoftonline.com/common/.well-known/openid-configuration'

  // Required
  clientID: '869e0dc2-907e-45fe-841f-34cc93beee63',

  // Required.
  // If you are using the common endpoint, you should either set `validateIssuer` to false, or provide a value for `issuer`.
  validateIssuer: true,

  // Required.
  // Set to true if you use `function(req, token, done)` as the verify callback.
  // Set to false if you use `function(req, token)` as the verify callback.
  passReqToCallback: true,

  // Required if you are using common endpoint and setting `validateIssuer` to true.
  // For tenant-specific endpoint, this field is optional, we will use the issuer from the metadata by default.
  issuer: 'https://login.microsoftonline.com/22e3aada-5a09-4e2b-9e0e-dc4f02328b29/v2.0',

  // Optional, default value is clientID
  audience: '869e0dc2-907e-45fe-841f-34cc93beee63',

  // Optional. Default value is false.
  // Set to true if you accept access_token whose `aud` claim contains multiple values.
  allowMultiAudiencesInToken: false,

  // Optional. 'error', 'warn' or 'info'
  loggingLevel: 'info',

  scope: ['Cherrytwist-GraphQL'],

  loggingNoPII: false
};