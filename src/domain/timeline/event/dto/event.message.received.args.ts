import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class CalendarEventMessageReceivedArgs {
  @Field(() => UUID, {
    description: 'The CalendarEvent to receive messages from.',
    nullable: false,
  })
  calendarEventID!: string;
}
