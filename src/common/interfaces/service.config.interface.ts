export interface IServiceConfig {
  graphqlEndpointPort: number;
  corsOrigin: string;
  corsMethods: string;
  corsAllowedHeaders: string;
  authenticationEnabled: string;
  authorisationBootstrapPath: string;
}
