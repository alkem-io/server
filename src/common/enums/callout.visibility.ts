import { registerEnumType } from '@nestjs/graphql';

export enum CalloutVisibility {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

registerEnumType(CalloutVisibility, {
  name: 'CalloutVisibility',
});
