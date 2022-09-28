import { registerEnumType } from '@nestjs/graphql';

export enum HubVisibility {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DEMO = 'demo',
}

registerEnumType(HubVisibility, {
  name: 'HubVisibility',
});
