import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ICommunity } from '@domain/community/community';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryMemberJoined', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryMemberJoined
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => IContributor, {
    nullable: false,
    description: 'The Contributor that joined the Community.',
  })
  contributor!: IContributor;

  @Field(() => RoleSetContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined the Community.',
  })
  contributorType!: RoleSetContributorType;

  @Field(() => ICommunity, {
    nullable: false,
    description: 'The community that was joined.',
  })
  community!: ICommunity;
}
