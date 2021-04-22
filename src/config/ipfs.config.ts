import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('ipfs_', () => ({
  endpoint: process.env.IPFS_ENDPOINT || 'http://127.0.0.1:5001',
  clientEndpoint: process.env.IPFS_CLIENT_ENDPOINT || 'https://ipfs.io/ipfs',
  maxFileSize: process.env.IPFS_MAX_FILE_SIZE || 2097152,
}));
