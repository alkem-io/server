import { Column, Entity } from 'typeorm';
import { IAiPersona } from './ai.persona.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiPersonaService } from '@services/ai-server/ai-persona-service';

@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  // No direct link; this is a generic identifier
  aiPersonaServiceID!: AiPersonaService;

  //   Meta information:
  // - interactionModes: Q+R
  // - contextModes: full, summary, public profile, none
  // - knowledge: (a description)
  @Column('text', { nullable: true })
  description = '';
}
