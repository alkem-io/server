import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFormState {
  OPEN = 'open',
  CLOSED = 'closed',
}

registerEnumType(CalloutFormState, {
  name: 'CalloutFormState',
  description: 'Whether a Form accepts new responses.',
});
