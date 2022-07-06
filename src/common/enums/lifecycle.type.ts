import { registerEnumType } from '@nestjs/graphql';

export enum LifecycleType {
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}

registerEnumType(LifecycleType, {
  name: 'LifecycleType',
});
