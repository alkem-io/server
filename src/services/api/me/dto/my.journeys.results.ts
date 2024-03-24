import { IJourney } from '@domain/challenge/base-challenge/journey.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';

@ObjectType()
export class MyJourneyResults {
  @Field(() => IJourney, { nullable: false })
  journey!: IJourney;

  @Field(() => IActivityLogEntry, { nullable: true })
  latestActivity?: IActivityLogEntry;
}
