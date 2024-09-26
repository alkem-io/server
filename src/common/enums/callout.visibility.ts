import { registerEnumType } from '@nestjs/graphql';

export enum CalloutVisibility {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  TEMPLATE = 'template',
}

registerEnumType(CalloutVisibility, {
  name: 'CalloutVisibility',
});
