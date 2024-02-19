import { UUID_NAMEID } from '@domain/common/scalars';
import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class CalendarArgsEvents {
  @Field(() => [UUID_NAMEID], {
    description: 'The IDs or NAMEIDS of the CalendarEvents to return',
    nullable: true,
  })
  IDs?: string[];

  @Field(() => Float, {
    description:
      'The number of CalendarEvents to return; if omitted return all CalendarEvents.',
    nullable: true,
  })
  limit?: number;
}
