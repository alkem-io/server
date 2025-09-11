import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VirtualContributorModelCard {
  aiPersona!: IAiPersona;
  aiPersonaEngine!: AiPersonaEngine;
}
