import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AiPersonaServiceQuestionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'Virtual Persona Type.',
  })
  aiPersonaServiceID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the context, the Virtual Persona is asked a question',
  })
  contextID?: string | undefined = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'User identifier used internaly by the engine',
  })
  userID?: string | undefined = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the message thread where the Virtual Contributor is asked a question if applicable',
  })
  threadID?: string | undefined = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The Virtual Contributor interaciton part of which is this question',
  })
  interactionID: string | undefined = undefined;
}
