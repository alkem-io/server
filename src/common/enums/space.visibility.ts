import { registerEnumType } from '@nestjs/graphql';

export enum SpaceVisibility {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DEMO = 'demo',
}

registerEnumType(SpaceVisibility, {
  name: 'SpaceVisibility',
});
