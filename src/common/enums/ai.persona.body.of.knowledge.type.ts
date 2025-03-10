import { registerEnumType } from '@nestjs/graphql';
export enum AiPersonaBodyOfKnowledgeType {
  ALKEMIO_SPACE = 'alkemio-space',
  ALKEMIO_KNOWLEDGE_BASE = 'alkemio-knowledge-base',
  WEBSITE = 'website',
  OTHER = 'other',
  NONE = 'none',
}
registerEnumType(AiPersonaBodyOfKnowledgeType, {
  name: 'AiPersonaBodyOfKnowledgeType',
});
