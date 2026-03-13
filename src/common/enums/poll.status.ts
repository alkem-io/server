import { registerEnumType } from '@nestjs/graphql';

export enum PollStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

registerEnumType(PollStatus, {
  name: 'PollStatus',
  description:
    'Lifecycle status of a Poll. Only OPEN is enforced in this iteration; CLOSED is reserved for future use.',
});
