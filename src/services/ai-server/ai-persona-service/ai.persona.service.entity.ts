import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IAiPersonaService } from './ai.persona.service.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiServer } from '../ai-server/ai.server.entity';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';

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

  @Column({ length: 128, nullable: false })
  engine!: AiPersonaEngine;

  @Column({
    length: 64,
    nullable: false,
    default: AiPersonaDataAccessMode.SPACE_PROFILE,
  })
  dataAccessMode!: AiPersonaDataAccessMode;

  @Column('text', { nullable: false })
  prompt!: string;

  @Column({ length: 64, nullable: true })
  bodyOfKnowledgeType!: AiPersonaBodyOfKnowledgeType;

  @Column({ length: 255, nullable: true })
  bodyOfKnowledgeID!: string;

  @Column({ type: 'datetime', nullable: true })
  bodyOfKnowledgeLastUpdated?: Date;
}
