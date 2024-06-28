import { ICommunity } from '@domain/community/community';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IContributor } from '@domain/community/contributor/contributor.interface';

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

  @Field(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined the Community.',
  })
  contributorType!: CommunityContributorType;

  @Field(() => String, {
    nullable: false,
    description: 'The type of the the Community.',
  })
  communityType!: string;

  @Field(() => ICommunity, {
    nullable: false,
    description: 'The community that was joined.',
  })
  community!: ICommunity;
}
