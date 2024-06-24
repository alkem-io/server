import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IAiPersonaService } from '../ai-persona-service/ai.persona.service.interface';

@ObjectType('AiServer')
export abstract class IAiServer extends IAuthorizable {
  aiPersonaServices?: IAiPersonaService[];
  defaultAiPersonaService?: IAiPersonaService;
}
