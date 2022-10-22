import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryChallengeCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryChallengeCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => IChallenge, {
    nullable: false,
    description: 'The Challenge that was created.',
  })
  challenge!: IChallenge;
}
