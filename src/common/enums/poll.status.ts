import { registerEnumType } from '@nestjs/graphql';

export enum PollStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

registerEnumType(PollStatus, {
  name: 'PollStatus',
  description:
    'Lifecycle status of a Poll. OPEN allows voting and option management; CLOSED prevents all state-mutating operations.',
});
