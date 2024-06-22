import { registerEnumType } from '@nestjs/graphql';
export enum BodyOfKnowledgeType {
  SPACE = 'space',
  OTHER = 'other',
}
registerEnumType(BodyOfKnowledgeType, {
  name: 'BodyOfKnowledgeType',
});
