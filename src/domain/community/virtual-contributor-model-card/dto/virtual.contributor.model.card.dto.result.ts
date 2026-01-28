import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { ObjectType } from '@nestjs/graphql';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';

@ObjectType()
export class VirtualContributorModelCard {
  aiPersona!: IAiPersona;
  aiPersonaEngine!: AiPersonaEngine;
}
