import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('service', () => ({
  graphqlEndpointPort: process.env.GRAPHQL_ENDPOINT
    ? Number(process.env.MYSQL_DB_PORT)
    : 4000,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  corsAllowedHeaders:
    process.env.CORS_ALLOWED_HEADERS ??
    'Origin, X-Requested-With, Content-Type, Accept',
  corsMethods: process.env.CORS_METHODS ?? 'GET,HEAD,PUT,PATCH,POST,DELETE',
  authenticationEnabled: process.env.AUTH_ENABLED ?? true,
  authorisationBootstrapPath: process.env.AUTH_BOOTSTRAP_PATH,
}));
