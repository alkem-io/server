import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IAiPersona } from './ai.persona.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiServer } from '../ai-server/ai.server.entity';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { IExternalConfig } from './dto/external.config';

// TODO: go through the fields and remove duplicates
@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  @ManyToOne(() => AiServer, aiServer => aiServer.aiPersonas, {
    eager: true,
  })
  @JoinColumn()
  aiServer?: AiServer;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  engine!: AiPersonaEngine;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Column('simple-json', { nullable: false })
  prompt!: string[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  bodyOfKnowledgeType!: AiPersonaBodyOfKnowledgeType;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  bodyOfKnowledgeID!: string;

  @Column({ type: 'datetime', nullable: true })
  bodyOfKnowledgeLastUpdated: Date | null = null;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  externalConfig?: IExternalConfig = {};

  @Column('text', { nullable: true })
  description?: string;

  @Column('simple-array', { nullable: false })
  interactionModes!: VirtualContributorInteractionMode[];

  @Column('text', { nullable: true })
  bodyOfKnowledge?: string;
}
