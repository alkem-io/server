import { registerEnumType } from '@nestjs/graphql';

export enum SigningAttemptStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

registerEnumType(SigningAttemptStatus, { name: 'SigningAttemptStatus' });
