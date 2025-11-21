import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

@InputType()
@ObjectType('CreateConversationData')
export class CreateConversationInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => CommunicationConversationType, { nullable: false })
  type!: CommunicationConversationType;

  @Field(() => UUID, { nullable: true })
  virtualContributorID?: string;

  @Field(() => VirtualContributorWellKnown, { nullable: true })
  wellKnownVirtualContributor?: VirtualContributorWellKnown;

  currentUserID!: string;
}
