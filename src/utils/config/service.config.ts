import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('service', () => ({
  graphqlEndpointPort: process.env.GRAPHQL_ENDPOINT
    ? Number(process.env.MYSQL_DB_PORT)
    : 4000,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  authenticationEnabled: process.env.AUTHENTICATION_ENABLED ?? true,
}));
