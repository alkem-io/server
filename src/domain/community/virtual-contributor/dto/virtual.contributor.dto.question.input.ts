import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VirtualContributorQuestionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'Virtual Contributor to be asked.',
  })
  virtualContributorID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The space in which context the Virtual Contributor is asked a question',
  })
  contextSpaceID: string | undefined = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'User identifier used internaly by the engine',
  })
  userID: string | undefined = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the message thread where the Virtual Contributor is asked a question',
  })
  threadID?: string | undefined = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The Virtual Contributor interaciton part of which is this question',
  })
  vcInteractionID?: string | undefined = undefined;
}
