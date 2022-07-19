import { registerEnumType } from '@nestjs/graphql';

export enum CalloutState {
  OPEN = 'Open',
  CLOSED = 'Closed',
  ARCHIVED = 'Archived',
}

registerEnumType(CalloutState, {
  name: 'CalloutState',
});
