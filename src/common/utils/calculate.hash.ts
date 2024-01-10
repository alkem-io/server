import { createHash } from 'node:crypto';

export const calculateHash = (data: Buffer) => {
  return createHash('sha3-256').update(data).digest('hex');
};
