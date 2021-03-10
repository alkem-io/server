import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('simple_auth_provider', () => ({
  issuer: process.env.AUTH_SIMPLE_AUTH_ISSUER || 'localhost',
  tokenEndpoint:
    process.env.AUTH_SIMPLE_AUTH_TOKEN_ENDPOINT ||
    'http://localhost:3002/auth/login',
  clientSecret: process.env.AUTH_SIMPLE_AUTH_CLIENT_SECRET || '$3cr3T',
}));
