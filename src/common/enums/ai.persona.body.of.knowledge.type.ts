import { registerEnumType } from '@nestjs/graphql';
export enum AiPersonaBodyOfKnowledgeType {
  ALKEMIO_SPACE = 'space', // TODO: rename to alkemio-space as value
  OTHER = 'other',
}
registerEnumType(AiPersonaBodyOfKnowledgeType, {
  name: 'AiPersonaBodyOfKnowledgeType',
});
