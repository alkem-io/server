import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IAiPersonaService } from './ai.persona.service.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiServer } from '../ai-server/ai.server.entity';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { IExternalConfig } from './dto/external.config';

@Entity()
export class AiPersonaService
  extends AuthorizableEntity
  implements IAiPersonaService
{
  @ManyToOne(() => AiServer, aiServer => aiServer.aiPersonaServices, {
    eager: true,
  })
  @JoinColumn()
  aiServer?: AiServer;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  engine!: AiPersonaEngine;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  dataAccessMode!: AiPersonaDataAccessMode;

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
}
