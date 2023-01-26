import { registerEnumType } from '@nestjs/graphql';

export enum CalendarEventType {
  EVENT = 'event',
  TRAINING = 'training',
  MILESTONE = 'milestone',
  OTHER = 'other',
}

registerEnumType(CalendarEventType, {
  name: 'CalendarEventType',
});
