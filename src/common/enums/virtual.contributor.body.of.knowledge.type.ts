import { registerEnumType } from '@nestjs/graphql';
export enum BodyOfKnowledgeType {
  SPACE = 'space',
}
registerEnumType(BodyOfKnowledgeType, {
  name: 'BodyOfKnowledgeType',
});
