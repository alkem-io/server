import { ENUM_LENGTH } from '@common/constants';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AiServer } from '../ai-server/ai.server.entity';
import { PromptGraph } from '../prompt-graph/dto/prompt.graph.dto';
import { IAiPersona } from './ai.persona.interface';
import { IExternalConfig } from './dto/external.config';
import { PromptGraphTransformer } from './transformers/prompt.graph.transformer';

@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  @ManyToOne(
    () => AiServer,
    aiServer => aiServer.aiPersonas,
    {
      eager: true,
    }
  )
  @JoinColumn()
  aiServer?: AiServer;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  engine!: AiPersonaEngine;

  @Column('simple-json', { nullable: false })
  prompt!: string[];

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  externalConfig?: IExternalConfig = {};

  @Column({ type: 'timestamp', nullable: true })
  bodyOfKnowledgeLastUpdated: Date | null = null;

  @Column('jsonb', { nullable: true, transformer: PromptGraphTransformer })
  promptGraph?: PromptGraph;
}
