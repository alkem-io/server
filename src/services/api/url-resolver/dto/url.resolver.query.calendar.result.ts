import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UrlResolverQueryResultCalendar {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => UUID, {
    nullable: true,
  })
  calendarEventId?: string;
}
