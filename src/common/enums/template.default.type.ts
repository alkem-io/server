import { registerEnumType } from '@nestjs/graphql';

export enum TemplateDefaultType {
  COLLABORATION_LEVEL_ZERO_SPACE = 'collaboration-level-zero-space',
  COLLABORATION_SUBSPACE = 'collaboration-subspace',
  COLLABORATION_EMPTY = 'collaboration-empty',
  COLLABORATION_CHALLENGE = 'collaboration-challenge',
  COLLABORATION_OPPORTUNITY = 'collaboration-opportunity',
  COLLABORATION_KNOWLEDGE = 'collaboration-knowledge',
  COLLABORATION_TUTORIALS = 'collaboration-tutorials',
}

registerEnumType(TemplateDefaultType, {
  name: 'TemplateDefaultType',
});
