import { registerEnumType } from '@nestjs/graphql';

export enum SpaceDisplayLocation {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DEMO = 'demo',
}

registerEnumType(SpaceDisplayLocation, {
  name: 'SpaceDisplayLocation',
});
