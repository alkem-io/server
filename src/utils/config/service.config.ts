import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('service', () => ({
  graphqlEndpointPort: process.env.GRAPHQL_ENDPOINT
    ? Number(process.env.MYSQL_DB_PORT)
    : 4000,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  authenticationEnabled: process.env.AUTH_ENABLED ?? true,
  authorisationBootstrapPath: process.env.AUTH_BOOTSTRAP_PATH,
  templatesBootstrapPath: process.env.TEMPLATES_BOOTSTRAP_PATH,
}));
