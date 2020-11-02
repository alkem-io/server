export interface IServiceConfig {
  graphqlEndpointPort: number;
  corsOrigin: string;
  authenticationEnabled: string;
  authorisationBootstrapPath: string;
  templatesBootstrapPath: string;
}
