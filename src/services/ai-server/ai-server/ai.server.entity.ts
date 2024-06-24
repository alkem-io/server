import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, OneToMany } from 'typeorm';
import { AiPersonaService } from '../ai-persona-service/ai.persona.service.entity';
import { IAiServer } from './ai.server.interface';

@Entity()
export class AiServer extends AuthorizableEntity implements IAiServer {
  @OneToMany(
    () => AiPersonaService,
    personaService => personaService.aiServer,
    {
      eager: false,
      cascade: true,
    }
  )
  aiPersonaServices!: AiPersonaService[];
}
