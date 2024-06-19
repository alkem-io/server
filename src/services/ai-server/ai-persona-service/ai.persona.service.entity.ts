import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IAiPersonaService } from './ai.persona.service.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiServer } from '../ai-server/ai.server.entity';
import { AiPersonaAccessMode } from '@common/enums/ai.persona.access.mode';
import { BodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
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
    default: AiPersonaAccessMode.SPACE_PROFILE,
  })
  dataAccessMode!: AiPersonaAccessMode;

  @Column('text', { nullable: false })
  prompt!: string;

  @Column({ length: 64, nullable: true })
  bodyOfKnowledgeType!: BodyOfKnowledgeType;

  @Column({ length: 255, nullable: true })
  bodyOfKnowledgeID!: string;
}
