import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IAiPersona } from './ai.persona.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiServer } from '../ai-server/ai.server.entity';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { ENUM_LENGTH } from '@common/constants';
import { IExternalConfig } from './dto/external.config';
import { PromptGraph } from './dto/prompt.graph.dto';
import { PromptGraphTransformer } from './transformers/prompt.graph.transformer';

@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  @ManyToOne(() => AiServer, aiServer => aiServer.aiPersonas, {
    eager: true,
  })
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

  @Column({ type: 'datetime', nullable: true })
  bodyOfKnowledgeLastUpdated: Date | null = null;

  @Column('json', { nullable: true, transformer: PromptGraphTransformer })
  promptGraph?: PromptGraph;
}
