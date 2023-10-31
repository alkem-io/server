import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';

@ObjectType()
export class MyJourneyResults {
  @Field(() => IBaseChallenge, { nullable: false })
  journey?: IBaseChallenge;

  latestActivity?: IActivityLogEntry;
}
