import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
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

  @Field(() => Markdown, {
    nullable: false,
    description: 'A overview of knowledge provided by this AI Persona.',
  })
  bodyOfKnowledge!: string;

  @Field(() => AiPersonaDataAccessMode, {
    nullable: false,
    description:
      'The type of context sharing that are supported by this AI Persona when used.',
  })
  dataAccessMode!: AiPersonaDataAccessMode;

  interactionModes!: AiPersonaInteractionMode[];
}
