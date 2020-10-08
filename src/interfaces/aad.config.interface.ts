export interface IAzureADConfig {
  identityMetadata: string;
  clientID: string;
  validateIssuer: boolean;
  passReqToCallback: boolean;
  issuer: string;
  audience: string;
  allowMultiAudiencesInToken: string;
  loggingLevel: string;
  loggingNoPII: boolean;
}