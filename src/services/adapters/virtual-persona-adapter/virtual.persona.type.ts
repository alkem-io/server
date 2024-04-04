import { registerEnumType } from '@nestjs/graphql';

export enum VirtualPersonaType {
  COMMUNITY_MANAGER = 'community-manager',
  TOPIC_EXPERT = 'topic-expert',
  DIGITAL_TWIN = 'digital-twin',
}

registerEnumType(VirtualPersonaType, {
  name: 'VirtualPersonaType',
});
