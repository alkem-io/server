import { IBearerStrategyOptionWithRequest, IOIDCStrategyOptionWithoutRequest } from 'passport-azure-ad';

export const config: IBearerStrategyOptionWithRequest = {
  // Requried
  identityMetadata: 'https://login.microsoftonline.com/atstoyanovhotmail.onmicrosoft.com/.well-known/openid-configuration',
  // or 'https://login.microsoftonline.com/<your_tenant_guid>/.well-known/openid-configuration'
  // or you can use the common endpoint
  // 'https://login.microsoftonline.com/common/.well-known/openid-configuration'

  // Required
  clientID: 'deb21435-84de-4841-aa85-5bb103ed058d',

  // Required.
  // If you are using the common endpoint, you should either set `validateIssuer` to false, or provide a value for `issuer`.
  validateIssuer: true,

  // Required.
  // Set to true if you use `function(req, token, done)` as the verify callback.
  // Set to false if you use `function(req, token)` as the verify callback.
  passReqToCallback: false,

  // Required if you are using common endpoint and setting `validateIssuer` to true.
  // For tenant-specific endpoint, this field is optional, we will use the issuer from the metadata by default.
  issuer: undefined,

  // Optional, default value is clientID
  audience: undefined,

  // Optional. Default value is false.
  // Set to true if you accept access_token whose `aud` claim contains multiple values.
  allowMultiAudiencesInToken: false,

  // Optional. 'error', 'warn' or 'info'
  loggingLevel: 'info',

  scope: ['openid', 'profile', 'offline_access']
};

export const OIDCConfig: IOIDCStrategyOptionWithoutRequest = {
  // Requried
  identityMetadata: 'https://login.microsoftonline.com/atstoyanovhotmail.onmicrosoft.com/.well-known/openid-configuration',
  // or 'https://login.microsoftonline.com/<your_tenant_guid>/.well-known/openid-configuration'
  // or you can use the common endpoint
  // 'https://login.microsoftonline.com/common/.well-known/openid-configuration'

  // Required
  clientID: 'cb4d7739-cb50-4555-a32c-e0b7c526f49d',
  clientSecret: 'rIVh6C_c-z5wF6x.NXBLi~_1~mXzH4DI1W',
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: 'http://localhost:4000/auth/openid/return',

  // Required.
  // If you are using the common endpoint, you should either set `validateIssuer` to false, or provide a value for `issuer`.
  validateIssuer: true,

  // Required if you are using common endpoint and setting `validateIssuer` to true.
  // For tenant-specific endpoint, this field is optional, we will use the issuer from the metadata by default.
  issuer: undefined,

  // Optional. 'error', 'warn' or 'info'
  loggingLevel: 'info',
  allowHttpForRedirectUrl: true,
  passReqToCallback: false,
  scope: ['openid', 'profile', 'offline_access']
}