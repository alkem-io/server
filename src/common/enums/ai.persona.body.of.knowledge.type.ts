import { registerEnumType } from '@nestjs/graphql';
export enum AiPersonaBodyOfKnowledgeType {
  ALKEMIO_SPACE = 'alkemio-space',
  OTHER = 'other',
  NONE = 'none',
}
registerEnumType(AiPersonaBodyOfKnowledgeType, {
  name: 'AiPersonaBodyOfKnowledgeType',
});
