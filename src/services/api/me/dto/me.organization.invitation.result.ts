import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { UUID } from '@domain/common/scalars';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OrganizationInvitationResult')
export class OrganizationInvitationResult {
  @Field(() => UUID, {
    description: 'ID for the pending organization invitation',
  })
  id!: string;

  @Field(() => IInvitation, {
    description: 'The invitation itself',
  })
  invitation!: IInvitation;

  @Field(() => IOrganization, {
    description: 'The organization the invitation is for',
  })
  organization!: IOrganization;
}
