import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('matrix', () => ({
  baseUrl: process.env.MATRIX_BASE_ENDPOINT || 'http://127.0.0.1:8008',
  idBaseUrl: process.env.MATRIX_ID_BASE_ENDPOINT || 'http://127.0.0.1:8008',
  sharedSecret: process.env.SYNAPSE_SHARED_SECRET,
}));
