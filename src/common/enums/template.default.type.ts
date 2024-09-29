import { registerEnumType } from '@nestjs/graphql';

export enum TemplateDefaultType {
  SPACE = 'space',
  SUBSPACE = 'subspace',
  SPACE_TUTORIALS = 'space-tutorials',
  SUBSPACE_TUTORIALS = 'subspace-tutorials',
  KNOWLEDGE = 'knowledge',
}

registerEnumType(TemplateDefaultType, {
  name: 'TemplateDefaultType',
});
