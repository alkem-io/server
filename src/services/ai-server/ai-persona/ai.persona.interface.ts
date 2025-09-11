import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { IAiServer } from '../ai-server/ai.server.interface';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { IExternalConfig } from './dto/external.config';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@ObjectType('AiPersona')
export abstract class IAiPersona extends IAuthorizable {
  aiServer?: IAiServer;

  @Field(() => AiPersonaEngine, {
    nullable: false,
    description: 'The AI Persona Engine being used by this AI Persona.',
  })
  engine!: AiPersonaEngine;

  @Field(() => [String], {
    nullable: false,
    description: 'The prompt used by this AI Persona',
  })
  prompt!: string[];

  @Field(() => VirtualContributorDataAccessMode, {
    nullable: false,
    description: 'The required data access by the AI Persona',
  })
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Field(() => AiPersonaBodyOfKnowledgeType, {
    nullable: false,
    description: 'The body of knowledge type used for the AI Persona',
  })
  bodyOfKnowledgeType!: AiPersonaBodyOfKnowledgeType;

  @Field(() => UUID, {
    nullable: true,
    description: 'The body of knowledge ID used for the AI Persona',
  })
  bodyOfKnowledgeID!: string;

  @Field(() => Date, {
    nullable: true,
    description:
      'When was the body of knowledge of the AI Persona last updated.',
  })
  bodyOfKnowledgeLastUpdated!: Date | null;

  @Field(() => IExternalConfig, {
    nullable: true,
    description: 'The external configuration for this AI Persona.',
  })
  externalConfig?: IExternalConfig;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The description for this AI Persona.',
  })
  description?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'An overview of knowledge provided by this AI Persona.',
  })
  bodyOfKnowledge?: string;

  @Field(() => [VirtualContributorInteractionMode], {
    nullable: false,
    description: 'The interaction modes supported by this AI Persona.',
  })
  interactionModes!: VirtualContributorInteractionMode[];
}
