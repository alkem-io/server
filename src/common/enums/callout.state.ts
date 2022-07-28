import { registerEnumType } from '@nestjs/graphql';

export enum CalloutState {
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

registerEnumType(CalloutState, {
  name: 'CalloutState',
});
