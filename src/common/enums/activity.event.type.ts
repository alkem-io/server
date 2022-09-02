import { registerEnumType } from '@nestjs/graphql';

export enum ActivityEventType {
  CALLOUT_PUBLISHED = 'callout_published',
  CARD_CREATED = 'card_created',
}

registerEnumType(ActivityEventType, {
  name: 'ActivityEventType',
});
