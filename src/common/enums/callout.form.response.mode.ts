import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFormResponseMode {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

registerEnumType(CalloutFormResponseMode, {
  name: 'CalloutFormResponseMode',
  description:
    'Whether a member can submit one or several responses to a Form.',
});
