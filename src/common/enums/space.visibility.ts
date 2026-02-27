import { registerEnumType } from '@nestjs/graphql';

export enum SpaceVisibility {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DEMO = 'demo',
  INACTIVE = 'inactive',
}

registerEnumType(SpaceVisibility, {
  name: 'SpaceVisibility',
});
