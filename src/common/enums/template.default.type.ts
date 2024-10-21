import { registerEnumType } from '@nestjs/graphql';

export enum TemplateDefaultType {
  PLATFORM_SPACE = 'platform-space',
  PLATFORM_SPACE_TUTORIALS = 'platform-space-tutorials',
  PLATFORM_SUBSPACE = 'platform-subspace',
  PLATFORM_SUBSPACE_KNOWLEDGE = 'platform-subspace-knowledge',
  SPACE_SUBSPACE = 'space-subspace',
}

registerEnumType(TemplateDefaultType, {
  name: 'TemplateDefaultType',
});
