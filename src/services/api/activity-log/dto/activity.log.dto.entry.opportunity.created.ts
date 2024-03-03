import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryOpportunityCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryOpportunityCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => IOpportunity, {
    nullable: false,
    description: 'The Opportunity that was created.',
  })
  opportunity!: IOpportunity;
}
