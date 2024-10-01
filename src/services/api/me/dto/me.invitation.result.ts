import { Field, ObjectType } from '@nestjs/graphql';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { CommunityPendingMembershipResult } from './me.pending.membership.result';

@ObjectType()
export class CommunityInvitationResult extends CommunityPendingMembershipResult {
  @Field(() => IInvitation, {
    description: 'The invitation itself',
  })
  invitation!: IInvitation;
}
