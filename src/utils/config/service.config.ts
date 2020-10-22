import { registerAs } from '@nestjs/config/dist/utils/register-as.util';
import { join } from 'path';

export default registerAs('service', () => ({
  graphqlEndpointPort: process.env.GRAPHQL_ENDPOINT
    ? Number(process.env.MYSQL_DB_PORT)
    : 4000,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  authenticationEnabled: process.env.AUTHENTICATION_ENABLED ?? true,
  authorisationBootstrapPath:
    process.env.AUTH_BOOTSTRAP_PATH ??
    join(__dirname, 'authorisation-bootstrap.json'),
}));
