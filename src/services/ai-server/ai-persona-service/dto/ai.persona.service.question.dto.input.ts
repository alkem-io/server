import { UUID } from '@domain/common/scalars';
import { ExternalMetadata } from '@domain/communication/vc-interaction/vc.interaction.entity';
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
      'The ID of the context, the Virtual Persona is asked a question.',
  })
  contextID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'User identifier used internaly by the engine.',
  })
  userID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the message thread where the Virtual Contributor is asked a question if applicable.',
  })
  threadID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The Virtual Contributor interaciton part of which is this question.',
  })
  interactionID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'The Virtual Contributor description.',
  })
  description?: string = undefined;

  @Field(() => String, {
    nullable: false,
    description: 'The Virtual Contributor displayName.',
  })
  displayName!: string;

  externalMetadata: ExternalMetadata = {};
}
