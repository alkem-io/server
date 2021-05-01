export interface IServiceConfig {
  graphqlEndpointPort: number;
  corsOrigin: string;
  corsMethods: string;
  corsAllowedHeaders: string;
  authenticationEnabled: boolean;
  authorisationBootstrapPath: string;
}
