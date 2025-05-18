import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AiPersona } from '@domain/community/ai-persona/ai.persona.entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiPersonaModelCard {
  aiPersona!: AiPersona;
  aiPersonaEngine!: AiPersonaEngine;
}
