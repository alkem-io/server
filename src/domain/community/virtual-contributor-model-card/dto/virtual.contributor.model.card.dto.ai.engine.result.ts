import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ModelCardAiEngineResult {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Is the AI Persona using an AI Engine not provided by Alkemio?',
  })
  isExternal!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Does the VC use an open-weight model?',
  })
  isUsingOpenWeightsModel!: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Is interaction data used in any way for model training? Null means Unknown.',
  })
  isInteractionDataUsedForTraining!: boolean | null;

  @Field(() => String, {
    nullable: false,
    description:
      'Is the VC prompted to limit the responses to a specific body of knowledge?',
  })
  areAnswersRestrictedToBodyOfKnowledge!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Can the VC access or search the web?',
  })
  canAccessWebWhenAnswering!: boolean;

  @Field(() => String, {
    nullable: false,
    description: 'Where is the AI service hosted?',
  })
  hostingLocation!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'Access to detailed information on the underlying models specifications',
  })
  additionalTechnicalDetails!: string;
}
