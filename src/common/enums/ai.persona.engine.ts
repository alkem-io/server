import { registerEnumType } from '@nestjs/graphql';

export enum AiPersonaEngine {
  GUIDANCE = 'guidance',
  EXPERT = 'expert',
  COMMUNITY_MANAGER = 'community-manager',
}

registerEnumType(AiPersonaEngine, {
  name: 'AiPersonaEngine',
});
