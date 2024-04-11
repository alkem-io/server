import { registerEnumType } from '@nestjs/graphql';

export enum VirtualPersonaEngine {
  GUIDANCE = 'guidance',
  COMMUNITY_MANAGER = 'community-manager',
  ALKEMIO_DIGILEEFOMGEVING = 'alkemio-digileefomgeving',
  ALKEMIO_WELCOME = 'alkemio-welcome',
}

registerEnumType(VirtualPersonaEngine, {
  name: 'VirtualPersonaEngine',
});
