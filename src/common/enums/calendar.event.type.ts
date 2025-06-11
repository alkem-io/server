import { registerEnumType } from '@nestjs/graphql';

export enum CalendarEventType {
  EVENT = 'event',
  DEADLINE = 'deadline',
  MEETING = 'meeting',
  MILESTONE = 'milestone',
  TRAINING = 'training',
  OTHER = 'other',
}

registerEnumType(CalendarEventType, {
  name: 'CalendarEventType',
});
