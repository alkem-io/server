import { registerEnumType } from '@nestjs/graphql';

export enum PollEventType {
  POLL_VOTE_UPDATED = 'POLL_VOTE_UPDATED',
  POLL_OPTIONS_CHANGED = 'POLL_OPTIONS_CHANGED',
}

registerEnumType(PollEventType, {
  name: 'PollEventType',
  description: 'The type of event that occurred on a poll.',
});
