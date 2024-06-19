import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
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

  @OneToOne(() => AiPersonaService, {
    eager: false,
    cascade: false,
  })
  @JoinColumn()
  defaultAiPersonaService?: AiPersonaService;
}
