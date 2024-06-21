import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';
import { AiPersonaInteractionMode } from '@common/enums/ai.persona.interaction.mode';

@ObjectType('AiPersona')
export class IAiPersona extends IAuthorizable {
  aiPersonaServiceID!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The description for this AI Persona.',
  })
  description!: string;

  @Field(() => AiPersonaBodyOfKnowledgeType, {
    nullable: false,
    description: 'The type of knowledge provided by this AI Persona.',
  })
  bodyOfKnowledgeType!: AiPersonaBodyOfKnowledgeType;

  @Field(() => AiPersonaDataAccessMode, {
    nullable: false,
    description:
      'The type of context sharing that are supported by this AI Persona when used.',
  })
  dataAccessMode!: AiPersonaDataAccessMode;

  @Field(() => [AiPersonaInteractionMode], {
    nullable: false,
    description:
      'The type of interactions that are supported by this AI Persona when used.',
  })
  interactionModes!: AiPersonaInteractionMode[];
}
