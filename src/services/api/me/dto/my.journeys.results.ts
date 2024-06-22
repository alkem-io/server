import { ISpace } from '@domain/space/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';

@ObjectType()
export class MySpaceResults {
  @Field(() => ISpace, { nullable: false })
  space!: ISpace;

  @Field(() => IActivityLogEntry, { nullable: true })
  latestActivity?: IActivityLogEntry;
}
