export interface IOidcConfig {
  clientID: string;
  clientSecret: string;
  passReqToCallback: boolean;
  metadataEndpoint: string;
  scope: string;
  issuer: string;
}
