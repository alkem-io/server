import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateCalendarEventInput } from '@domain/timeline/event/dto/event.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCalendarEventOnCalendarInput extends CreateCalendarEventInput {
  @Field(() => UUID, { nullable: false })
  calendarID!: string;
}
