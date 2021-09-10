import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationResultEntry } from './membership.dto.application.result.entry';
import { MembershipCommunityResultEntry } from './membership.dto.community.result.entry';
import { MembershipUserResultEntryEcoverse } from './membership.dto.user.result.entry.ecoverse';
import { MembershipUserResultEntryOrganisation } from './membership.dto.user.result.entry.organisation';

@ObjectType()
export class UserMembership {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => [MembershipUserResultEntryEcoverse], {
    description:
      'Details of Ecoverses the user is a member of, with child memberships',
  })
  ecoverses: MembershipUserResultEntryEcoverse[] = [];

  @Field(() => [MembershipUserResultEntryOrganisation], {
    description:
      'Details of the Organisations the user is a member of, with child memberships.',
  })
  organisations: MembershipUserResultEntryOrganisation[] = [];

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
