import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationResultEntry } from './membership.dto.application.result.entry';
import { MembershipCommunityResultEntry } from './membership.dto.community.result.entry';
import { MembershipUserResultEntryHub } from './membership.dto.user.result.entry.hub';
import { MembershipUserResultEntryOrganization } from './membership.dto.user.result.entry.organization';

@ObjectType()
export class UserMembership {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => [MembershipUserResultEntryHub], {
    description:
      'Details of Hubs the user is a member of, with child memberships',
  })
  hubs: MembershipUserResultEntryHub[] = [];

  @Field(() => [MembershipUserResultEntryOrganization], {
    description:
      'Details of the Organizations the user is a member of, with child memberships.',
  })
  organizations: MembershipUserResultEntryOrganization[] = [];

  @Field(() => [MembershipCommunityResultEntry], {
    description: 'All the communitites the user is a part of.',
  })
  communities: MembershipCommunityResultEntry[] = [];

  @Field(() => [ApplicationResultEntry], {
    nullable: true,
    description: 'Open applications for this user.',
  })
  applications: ApplicationResultEntry[] = [];
}
