import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInvitation } from '@domain/community/invitation/invitation.interface';
import { ISpace } from '@domain/space/space/space.interface';

@ObjectType()
export class CommunityInvitationResult {
  @Field(() => UUID, {
    description: 'ID for the Invitation',
  })
  id!: string;

  @Field(() => IInvitation, {
    description: 'The inviation itself',
  })
  invitation!: IInvitation;

  @Field(() => String, {
    description: 'The current state of the invitation.',
  })
  state!: string;

  @Field(() => ISpace, {
    description: 'The space that the invitation is for',
  })
  space!: ISpace;
}
