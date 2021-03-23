import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('service', () => ({
  authEnabled: process.env.AUTH_ENABLED === 'true',
  graphqlEndpointPort: process.env.GRAPHQL_ENDPOINT
    ? Number(process.env.GRAPHQL_ENDPOINT)
    : 4000,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  corsAllowedHeaders:
    process.env.CORS_ALLOWED_HEADERS ??
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  corsMethods: process.env.CORS_METHODS ?? 'GET,HEAD,PUT,PATCH,POST,DELETE',
  authenticationEnabled: process.env.AUTH_ENABLED ?? true,
  authorisationBootstrapPath: process.env.AUTH_BOOTSTRAP_PATH,
}));
