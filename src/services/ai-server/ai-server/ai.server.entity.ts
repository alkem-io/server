import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiPersona } from '../ai-persona/ai.persona.entity';
import { IAiServer } from './ai.server.interface';

export class AiServer extends AuthorizableEntity implements IAiServer {
  aiPersonas!: AiPersona[];
}
