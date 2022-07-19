import { registerEnumType } from '@nestjs/graphql';

export enum CalloutState {
  DRAFT = 'Draft',
  OPEN = 'Open',
  CLOSED = 'Closed',
  ARCHIVED = 'Archived',
}

registerEnumType(CalloutState, {
  name: 'CalloutState',
});
