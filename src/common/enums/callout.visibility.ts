import { registerEnumType } from '@nestjs/graphql';

export enum CalloutVisibility {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

registerEnumType(CalloutVisibility, {
  name: 'CalloutVisibility',
});
