import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IAiPersona } from './ai.persona.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import {
  AiPersonaService,
  IAiPersonaService,
} from '@services/ai-server/ai-persona-service';

@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  @OneToOne(() => IAiPersonaService, {
    eager: true,
    cascade: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  aiPersonaService!: AiPersonaService;

  //   Meta information:
  // - interactionModes: Q+R
  // - contextModes: full, summary, public profile, none
  // - knowledge: (a description)
  @Column('text', { nullable: true })
  description = '';
}
