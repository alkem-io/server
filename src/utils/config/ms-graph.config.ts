import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('ms-graph', () => ({
  clientID: process.env.AAD_CLIENT || '',
  clientSecret: process.env.AAD_CLIENT_SECRET || '',
  scope: process.env.AAD_API_SCOPE || '',
}));
