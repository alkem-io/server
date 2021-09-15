import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationResultEntry } from './membership.dto.application.result.entry';
import { MembershipUserResultEntryEcoverse } from './membership.dto.user.result.entry.ecoverse';
import { MembershipUserResultEntryOrganization } from './membership.dto.user.result.entry.organization';

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

  @Field(() => [MembershipUserResultEntryOrganization], {
    description:
      'Details of the Organizations the user is a member of, with child memberships.',
  })
  organizations: MembershipUserResultEntryOrganization[] = [];

  @Field(() => [ApplicationResultEntry], {
    nullable: true,
    description: 'Open applications for this user.',
  })
  applications: ApplicationResultEntry[] = [];
}
