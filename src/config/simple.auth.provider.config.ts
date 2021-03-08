import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('simple_auth_provider', () => ({
  issuer: process.env.AUTH_SIMPLE_AUTH_ISSUER || '',
  tokenEndpoint: process.env.AUTH_SIMPLE_AUTH_TOKEN_ENDPOINT || '',
  clientSecret: process.env.AUTH_SIMPLE_AUTH_CLIENT_SECRET || '$3cr3T',
}));
