import { registerEnumType } from '@nestjs/graphql';

export enum AiPersonaEngine {
  GUIDANCE = 'guidance',
  EXPERT = 'expert',
  LIBRA_FLOW = 'libra-flow',
  GENERIC_OPENAI = 'generic-openai',
  OPENAI_ASSISTANT = 'openai-assistant',
  COMMUNITY_MANAGER = 'community-manager',
}

registerEnumType(AiPersonaEngine, {
  name: 'AiPersonaEngine',
});
