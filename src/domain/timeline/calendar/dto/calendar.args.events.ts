import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class CalendarArgsEvents {
  @Field(() => [UUID], {
    name: 'IDs',
    description: 'The IDs of the CalendarEvents to return',
    nullable: true,
  })
  IDs?: string[];

  @Field(() => Float, {
    name: 'limit',
    description:
      'The number of CalendarEvents to return; if omitted return all CalendarEvents.',
    nullable: true,
  })
  limit?: number;
}
