import { registerEnumType } from '@nestjs/graphql';
export enum VirtualContributorBodyOfKnowledgeType {
  ALKEMIO_SPACE = 'alkemio-space',
  ALKEMIO_KNOWLEDGE_BASE = 'alkemio-knowledge-base',
  WEBSITE = 'website',
  OTHER = 'other',
  NONE = 'none',
}
registerEnumType(VirtualContributorBodyOfKnowledgeType, {
  name: 'AiPersonaBodyOfKnowledgeType',
});
