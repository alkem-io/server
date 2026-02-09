import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, OneToMany } from 'typeorm';
import { AiPersona } from '../ai-persona/ai.persona.entity';
import { IAiServer } from './ai.server.interface';

@Entity()
export class AiServer extends AuthorizableEntity implements IAiServer {
  @OneToMany(
    () => AiPersona,
    aiPersona => aiPersona.aiServer,
    {
      eager: false,
      cascade: true,
    }
  )
  aiPersonas!: AiPersona[];
}
