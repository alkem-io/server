export interface IAzureADConfig {
  identityMetadata: string;
  clientID: string;
  clientSecret: string;
  validateIssuer: boolean;
  passReqToCallback: boolean;
  issuer: string;
  audience: string;
  allowMultiAudiencesInToken: string;
  loggingLevel: string;
  loggingNoPII: boolean;
  scope: string;
}
